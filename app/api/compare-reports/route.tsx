// app/api/compare-reports/route.ts
import { NextRequest, NextResponse } from "next/server";

// SIMPLE LOCAL FALLBACK (used if openrouter fails)
function simpleSimilarity(a: string, b: string) {
  const A = new Set(a.toLowerCase().split(/\W+/));
  const B = new Set(b.toLowerCase().split(/\W+/));
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size || 1;
  return (inter / union) * 100;
}

function sentences(text: string) {
  return text
    .split(/(?<=\.|\?|!)\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 300);
}

// OPENROUTER EMBEDDINGS
async function embedWithOpenRouter(apiKey: string, input: string | string[]) {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenRouter embedding failed: ${txt}`);
  }

  return res.json();
}

// OPENROUTER CHAT FOR SUMMARY
async function chatSummaryOpenRouter(apiKey: string, aiText: string, docText: string) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Compare these reports. List 3 similarities and 3 differences:\n\nAI Report:\n${aiText}\n\nDoctor Report:\n${docText}`
      }]
    })
  });

  if (!res.ok) return "";

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const { aiReport, doctorReport } = await req.json();

    const apiKey = process.env.OPEN_ROUTER_API_KEY;
    if (!apiKey) {
      console.error("Missing OPEN_ROUTER_API_KEY");
      return NextResponse.json({ error: "Server missing API key" }, { status: 500 });
    }

    // Build AI text
    const aiText = [
      aiReport.chiefComplaint ?? "",
      aiReport.summary ?? "",
      (aiReport.recommendations || []).join(". "),
      (aiReport.tests || []).join(". "),
      (aiReport.medicationsRecommended || []).join(". ")
    ]
      .filter(Boolean)
      .join("\n\n");

    // ------------ TRY REAL AI COMPARISON ------------
    try {
      // Embeddings for AI & doctor report
      const [aiEmb, docEmb] = await Promise.all([
        embedWithOpenRouter(apiKey, aiText),
        embedWithOpenRouter(apiKey, doctorReport)
      ]);

      const aiVec = aiEmb?.data?.[0]?.embedding;
      const docVec = docEmb?.data?.[0]?.embedding;
      if (!aiVec || !docVec) throw new Error("Embedding vector missing");

      // Cosine similarity
      const dot = aiVec.reduce((s: number, v: number, i: number) => s + v * (docVec[i] ?? 0), 0);
      const magA = Math.sqrt(aiVec.reduce((s: number, v: number) => s + v * v, 0));
      const magB = Math.sqrt(docVec.reduce((s: number, v: number) => s + v * v, 0));
      const similarity = (dot / (magA * magB)) * 100;

      // Sentence analysis
      const docs = sentences(doctorReport);
      const sentEmb = await embedWithOpenRouter(apiKey, docs);
      const sentVecs = sentEmb.data.map((d: any) => d.embedding);

      const matches = docs.map((text, i) => {
        const v = sentVecs[i];
        const dot2 = aiVec.reduce((s: number, v2: number, k: number) => s + v2 * (v[k] ?? 0), 0);
        const magB2 = Math.sqrt(v.reduce((s: number, x: number) => s + x * x, 0));
        const sim = dot2 / (magA * magB2);
        return { sentence: text, similarity: Number(sim.toFixed(4)) };
      }).sort((a, b) => b.similarity - a.similarity).slice(0, 8);

      const summary = await chatSummaryOpenRouter(apiKey, aiText, doctorReport);

      return NextResponse.json({
        similarity: Number(similarity.toFixed(2)),
        matches,
        summary,
        aiText
      });
    }

    // ------------ FALLBACK MODE (no quota or error) ------------
    catch (err) {
      console.error("OpenRouter failed → fallback mode:", err);
      const similarity = simpleSimilarity(aiText, doctorReport);
      const docs = sentences(doctorReport);

      const matches = docs.slice(0, 8).map((s) => ({
        sentence: s,
        similarity: Number(simpleSimilarity(aiText, s).toFixed(4))
      }));

      return NextResponse.json({
        similarity: Number(similarity.toFixed(2)),
        matches,
        summary: "OpenRouter quota exceeded. Using simple local similarity.",
        aiText
      });
    }

  } catch (err: any) {
    console.error("compare-reports fatal error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
