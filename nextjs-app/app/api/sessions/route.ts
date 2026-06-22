import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client.js";
import { SessionRepo } from "@/lib/db/session-repo.js";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "20"), 1), 100);

  try {
    const db = getDb();
    const repo = new SessionRepo(db);
    const sessions = repo.listRecent(limit);
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("Sessions list error:", err);
    return NextResponse.json({ sessions: [] });
  }
}
