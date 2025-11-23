// app/api/session-report/route.ts
import { db } from "@/config/db";
import { openai } from "@/config/OpenAiModel";
import { SessionChatTable } from "@/config/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * Strict prompt (no backticks inside) — demands JSON-only output and demo-only meds/tests.
 */
const REPORT_GEN_PROMPT = `
You are an AI Medical Voice Agent that just finished a voice conversation with a user.
Based on the provided agent info and conversation transcript, produce a single, valid JSON object and NOTHING else.

CRITICAL RULES
- Respond ONLY with a single JSON object (no text, no markdown, no backticks, no explanations).
- The JSON object MUST include all keys in the REQUIRED SCHEMA below (keys are case-sensitive).
- If you would normally refuse to recommend medications for legal/ethical reasons, you MUST instead return a set of example/demo medication names labeled with the suffix " (demo only)" and provide only general medication names or drug classes — do NOT include specific dosing or prescriptive instructions. This is for demonstration purposes only.
- Provide 2-3 tests in the "tests" array (simple names like "CBC", "Chest X-ray", "CRP").
- Use empty arrays [] for unknown lists, and "Anonymous" when user name is not available.
- Use ISO 8601 for the "timestamp" field.

REQUIRED JSON SCHEMA
{
  "sessionId": "string",
  "agent": "string",
  "user": "string",
  "timestamp": "ISO Date string",
  "chiefComplaint": "string",
  "summary": "string",
  "symptoms": ["symptom1", "symptom2"],
  "duration": "string",
  "severity": "mild|moderate|severe",
  "medicationsMentioned": ["med1", "med2"],
  "recommendations": ["rec1", "rec2"],
  "tests": ["test1", "test2"],
  "medicationsRecommended": ["medName (demo only)", "Another med (demo only)"]
}

Return only the JSON object. Nothing else.
`;

/** ---------------- Helpers ---------------- **/

// remove triple-backticks and extract the first {...} block if present
function extractJson(text: string) {
  if (!text || typeof text !== "string") return "";
  const cleaned = text.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

function validateReport(obj: any) {
  if (!obj || typeof obj !== "object") return { ok: false, missing: ["entire object"] };

  const required = [
    "sessionId",
    "agent",
    "user",
    "timestamp",
    "chiefComplaint",
    "summary",
    "symptoms",
    "duration",
    "severity",
    "medicationsMentioned",
    "recommendations",
    "tests",
    "medicationsRecommended",
  ];

  const missing: string[] = [];
  for (const k of required) {
    if (!(k in obj)) {
      missing.push(k);
    } else {
      const v = obj[k];
      if (
        k === "symptoms" ||
        k === "medicationsMentioned" ||
        k === "recommendations" ||
        k === "tests" ||
        k === "medicationsRecommended"
      ) {
        if (!Array.isArray(v)) missing.push(`${k} (should be array)`);
      } else {
        if (typeof v !== "string") missing.push(`${k} (should be string)`);
      }
    }
  }

  return { ok: missing.length === 0, missing };
}

/** Demo fallback mapping — examples only, safe placeholders (demo-only) */
const demoFallbacks: Record<string, { tests: string[]; meds: string[] }> = {
  general: {
    tests: ["CBC", "CRP"],
    meds: ["Analgesic (e.g., paracetamol) (demo only)", "Antipyretic (demo only)"],
  },
  respiratory: {
    tests: ["Chest X-ray", "CBC"],
    meds: ["Expectorant (demo only)", "Bronchodilator (demo only)", "Analgesic (demo only)"],
  },
  infection: {
    tests: ["CBC", "CRP", "Blood culture (if indicated)"],
    meds: ["Analgesic (e.g., paracetamol) (demo only)", "Antibiotic (class example) (demo only)"],
  },
  uti: {
    tests: ["Urine analysis", "Urine culture"],
    meds: ["Nitrofurantoin (example; demo only)", "Trimethoprim-sulfamethoxazole (example; demo only)"],
  },
  gastro: {
    tests: ["Stool routine", "CBC"],
    meds: ["Oral rehydration (demo only)", "Antiemetic (demo only)"],
  },
  cardio: {
    tests: ["ECG", "Troponin (if indicated)"],
    meds: ["Antiplatelet (demo only)", "Analgesic (demo only)"],
  },
  hypertension: {
    tests: ["BP monitoring", "Basic metabolic panel"],
    meds: ["ACE inhibitor (class example) (demo only)", "Calcium channel blocker (demo only)"],
  },
  diabetes: {
    tests: ["Fasting blood glucose", "HbA1c"],
    meds: ["Metformin (example; demo only)", "Insulin (type-specific; demo only)"],
  },
};

/** Detect likely refusal text inside an array */
function isRefusalArray(arr: any[]) {
  if (!Array.isArray(arr)) return true;
  if (arr.length === 0) return true;
  const joined = arr.join(" ").toLowerCase();
  return /cannot recommend|cannot provide|i cannot recommend|consult a doctor|no recommendations|cannot advise/i.test(
    joined
  );
}

/** Pick fallback mapping based on specialist or chief complaint keywords */
function chooseFallback(report: any, sessionDetails: any) {
  const specialty = String(sessionDetails?.selectedDoctor?.specialist || "").toLowerCase();
  const chief = String(report?.chiefComplaint || "").toLowerCase();

  if (specialty.includes("respir") || chief.includes("cough") || chief.includes("breath")) return demoFallbacks.respiratory;
  if (chief.includes("fever") || chief.includes("infection")) return demoFallbacks.infection;
  if (chief.includes("urine") || chief.includes("burning") || chief.includes("dysuria")) return demoFallbacks.uti;
  if (chief.includes("diarr") || chief.includes("vomit") || chief.includes("nausea")) return demoFallbacks.gastro;
  if (specialty.includes("cardio") || chief.includes("chest")) return demoFallbacks.cardio;
  if (specialty.includes("hyper") || chief.includes("blood pressure")) return demoFallbacks.hypertension;
  if (specialty.includes("diabet") || chief.includes("sugar") || chief.includes("glucose")) return demoFallbacks.diabetes;
  return demoFallbacks.general;
}

/** Ensure demo-only suffix exists */
function ensureDemoLabel(meds: string[]) {
  return meds.map((m) => (/\(demo only\)/i.test(m) ? m : `${m} (demo only)`));
}

/** Normalize medication strings for matching (remove demo tag, punctuation, lowercase) */
function normalizeMedName(s: string) {
  return String(s || "").toLowerCase().replace(/\(demo only\)/gi, "").replace(/[^a-z0-9\s]/gi, "").trim();
}

/** Compare two medication lists and return Jaccard + sets */
function compareMedicationLists(aiMeds: string[], doctorMeds: string[]) {
  const aiNorm = (aiMeds || []).map(normalizeMedName).filter(Boolean);
  const docNorm = (doctorMeds || []).map(normalizeMedName).filter(Boolean);

  const aiSet = new Set(aiNorm);
  const docSet = new Set(docNorm);

  const intersection = [...aiSet].filter((x) => docSet.has(x));
  const union = new Set([...aiSet, ...docSet]);

  const jaccard = union.size === 0 ? 0 : intersection.length / union.size;

  const aiOnly = [...aiSet].filter((x) => !docSet.has(x));
  const doctorOnly = [...docSet].filter((x) => !aiSet.has(x));

  return {
    jaccardScore: Number((jaccard * 100).toFixed(2)), // percent 0-100
    intersection,
    aiOnly,
    doctorOnly,
  };
}

/** ---------------- Main handler ---------------- **/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Accept doctorMedications as optional array of strings for comparison
    // body expected shape: { message, sessionId, sessionDetails, doctorMedications? }
    const { message, sessionId, sessionDetails, doctorMedications } = body;

    if (!message || !sessionId || !sessionDetails) {
      return NextResponse.json(
        { error: "Missing required fields: message, sessionId, sessionDetails" },
        { status: 400 }
      );
    }

    const UserInputs = "AI Doctor Agent Info:" + JSON.stringify(sessionDetails) + ", Conversation:" + JSON.stringify(message);

    // Primary model call (strict JSON request)
    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        { role: "system", content: REPORT_GEN_PROMPT },
        { role: "user", content: UserInputs },
      ],
      temperature: 0,
      max_tokens: 1400,
    });

    const rawMessage = completion.choices?.[0]?.message?.content;
    if (!rawMessage) {
      console.error("No message content from model:", completion);
      return NextResponse.json({ error: "No response from AI model" }, { status: 500 });
    }

    // Parse JSON robustly with one retry
    let parsed: any;
    let usedRetry = false;

    try {
      const maybeJson = extractJson(rawMessage);
      parsed = JSON.parse(maybeJson);
    } catch (e) {
      console.warn("Initial parse failed. Raw model output:", rawMessage);

      // Retry prompt: ask model to return only corrected JSON
      const retryPrompt = `
The previous response was not valid JSON for the required schema.
Return ONLY a single valid JSON object that matches the schema exactly (no explanation, no backticks).
If you are missing data, provide empty arrays [] or "Anonymous" / reasonable defaults.
Schema keys required:
sessionId, agent, user, timestamp, chiefComplaint, summary, symptoms, duration, severity, medicationsMentioned, recommendations, tests, medicationsRecommended
Previous response: ${rawMessage}
Return only the corrected JSON object now.
      `.trim();

      const retry = await openai.chat.completions.create({
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "system", content: retryPrompt }],
        temperature: 0,
        max_tokens: 900,
      });

      const retryRaw = retry.choices?.[0]?.message?.content;
      if (!retryRaw) {
        console.error("Retry produced no content:", retry);
        return NextResponse.json({ error: "AI model failed to produce valid JSON" }, { status: 500 });
      }

      try {
        const retryJson = extractJson(retryRaw);
        parsed = JSON.parse(retryJson);
        usedRetry = true;
      } catch (e2) {
        console.error("Retry parse failed. retryRaw:", retryRaw);
        return NextResponse.json({ error: "AI model produced invalid JSON" }, { status: 500 });
      }
    }

    // Validate required fields
    const validation = validateReport(parsed);
    if (!validation.ok) {
      console.warn("Validation failed - missing:", validation.missing);

      // If missing fields beyond tests/meds, return error to help debug
      const onlyTestsMedsMissing = validation.missing.every((m: string) =>
        ["tests", "medicationsRecommended", "tests (should be array)", "medicationsRecommended (should be array)"].includes(m)
      );

      if (!onlyTestsMedsMissing) {
        console.error("Parsed AI response missing critical fields:", validation.missing, { parsed });
        return NextResponse.json(
          { error: "AI response missing required fields", missing: validation.missing, raw: parsed },
          { status: 500 }
        );
      }
    }

    // Normalize timestamp
    try {
      const parsedDate = new Date(parsed.timestamp);
      if (isNaN(parsedDate.getTime())) throw new Error("invalid");
      parsed.timestamp = parsedDate.toISOString();
    } catch {
      parsed.timestamp = new Date().toISOString();
    }

    // Apply fallback for tests/meds if needed
    const fallback = chooseFallback(parsed, sessionDetails);

    if (!Array.isArray(parsed.tests) || isRefusalArray(parsed.tests)) {
      parsed.tests = (fallback.tests || []).slice(0, 3);
    }

    if (!Array.isArray(parsed.medicationsRecommended) || isRefusalArray(parsed.medicationsRecommended)) {
      parsed.medicationsRecommended = (fallback.meds || []).slice(0, 3);
    }

    // Ensure demo labels
    parsed.medicationsRecommended = ensureDemoLabel(parsed.medicationsRecommended || []);

    // Normalize other arrays
    parsed.symptoms = Array.isArray(parsed.symptoms) ? parsed.symptoms : [];
    parsed.medicationsMentioned = Array.isArray(parsed.medicationsMentioned) ? parsed.medicationsMentioned : [];
    parsed.recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

    // Persist to DB
    try {
      await db.update(SessionChatTable)
        .set({
          report: parsed,
          conversation: message,
        })
        .where(eq(SessionChatTable.sessionId, sessionId));
    } catch (dbErr) {
      console.error("DB update failed:", dbErr);
      return NextResponse.json({ error: "Failed to persist report" }, { status: 500 });
    }

    // Prepare medication comparison (if doctorMedications provided)
    const doctorMedsInput = Array.isArray(doctorMedications)
      ? doctorMedications
      : Array.isArray(sessionDetails?.doctorReportedMedications)
      ? sessionDetails.doctorReportedMedications
      : [];

    const medicationComparison = compareMedicationLists(parsed.medicationsRecommended || [], doctorMedsInput || []);

    const meta = {
      usedRetry,
      usedFallbackForTests: isRefusalArray(parsed.tests) ? true : false,
      medicationComparison,
    };

    return NextResponse.json({ ...parsed, _meta: meta });
  } catch (error) {
    console.error("Unhandled error in POST /api/session-report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
