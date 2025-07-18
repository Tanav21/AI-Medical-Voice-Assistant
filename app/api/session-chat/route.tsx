import { db } from "@/config/db";
import { SessionChatTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  const { notes, selectedDoctor } = await request.json();
  const user = await currentUser();

  try {
    const sessionId = uuidv4();

    const res = await db
      .insert(SessionChatTable)
      .values({
        sessionId,
        createdBy: user?.primaryEmailAddress?.emailAddress ?? "unknown",
        selectedDoctor,
        notes,
        createdOn: new Date().toISOString(),
      })
      .returning(); // ✅ returns the inserted row(s)

    return NextResponse.json(res[0]); // ✅ response is now serializable
  } catch (e) {
    console.error("❌ Session creation failed:", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (sessionId === "all") {
    const result = await db
      .select()
      .from(SessionChatTable)
      //@ts-ignore
      .where(eq(SessionChatTable.createdBy, user.primaryEmailAddress?.emailAddress))
      .orderBy(desc(SessionChatTable.id));
    return NextResponse.json(result || null);
  } else {
    const result = await db
      .select()
      .from(SessionChatTable)
      //@ts-ignore
      .where(eq(SessionChatTable.sessionId, sessionId));
    return NextResponse.json(result[0] || null);
  }
}