import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client.js";
import { ChatRepo } from "@/lib/db/chat-repo.js";
import { createSSEEmitter } from "@/lib/chat/sse-emitter.js";
import { getSessionManager } from "@/lib/chat/session-manager.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const db = getDb();
  const repo = new ChatRepo(db);
  const mgr = getSessionManager(repo);

  const session = mgr.getSession(sessionId);
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const emitter = createSSEEmitter({
        enqueue(data: Uint8Array) {
          if (!closed) controller.enqueue(data);
        },
        close() {
          closed = true;
          controller.close();
        },
      });

      // Send current status
      emitter.emit("status-change", { status: session.status });

      // Passive observer: poll DB for new messages every 500ms
      let lastTimestamp = Date.now();
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const newMsgs = repo.getSince(sessionId, lastTimestamp);
          for (const msg of newMsgs) {
            emitter.emit("message", msg);
            lastTimestamp = Math.max(lastTimestamp, msg.timestamp);
          }
          const currentSession = mgr.getSession(sessionId);
          if (currentSession && currentSession.status !== session.status) {
            session.status = currentSession.status;
            emitter.emit("status-change", { status: currentSession.status });
            if (currentSession.status === "STOPPED") {
              emitter.close();
              clearInterval(interval);
            }
          } else if (currentSession?.status === "STOPPED") {
            emitter.close();
            clearInterval(interval);
          }
        } catch (err) {
          console.error("SSE poll error:", err);
        }
      }, 500);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
