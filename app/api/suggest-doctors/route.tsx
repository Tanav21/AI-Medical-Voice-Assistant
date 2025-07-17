import { openai } from "@/config/OpenAiModel";
import { AIDoctorAgents } from "@/shared/list";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { notes } = await request.json();

  try {
    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content: `Here is a list of all available doctor agents:\n${JSON.stringify(AIDoctorAgents)}\nOnly suggest doctors from this list.`,
        },
        {
          role: "user",
          content:
            `User Notes/Symptoms: ${notes}. Based on these notes and symptoms, ` +
            `suggest a list of matching doctors **from the provided list**. ` +
            `Return ONLY a JSON array of doctor objects — no wrapping inside another object, and no markdown formatting like \`\`\`json.`,
        },
      ],
    });

    const rawResponse = completion.choices[0].message?.content || "";

    // Remove markdown formatting if present
    const cleaned = rawResponse
      .replace(/^```json/, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();

    const parsedDoctors = JSON.parse(cleaned);

    // Optional: Enrich with image URLs from AIDoctorAgents if only ids are returned
    const enrichedDoctors = parsedDoctors.map((doc: any) => {
      const match = AIDoctorAgents.find((d) => d.id === doc.id);
      return match ? { ...doc, image: match.image } : doc;
    });

    return NextResponse.json(enrichedDoctors);
  } catch (error) {
    console.error("Error in POST request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
