import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { WS_EVENTS } from "./events.js";

let _io: Server | null = null;

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  const analysisNs = io.of("/analysis");

  analysisNs.on("connection", (socket: Socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    socket.on(WS_EVENTS.SUBSCRIBE, ({ sessionId }: { sessionId: string }) => {
      socket.join(sessionId);
      socket.emit("subscribed", { sessionId });
      console.log(`[WS] ${socket.id} → session ${sessionId}`);
    });

    socket.on(WS_EVENTS.UNSUBSCRIBE, ({ sessionId }: { sessionId: string }) => {
      socket.leave(sessionId);
      socket.emit("unsubscribed", { sessionId });
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketIO(): Server {
  if (!_io) throw new Error("Socket.IO not initialized");
  return _io;
}

export function setSocketIO(io: Server): void {
  _io = io;
}
