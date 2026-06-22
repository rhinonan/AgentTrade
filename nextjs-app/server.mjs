import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import dotenv from "dotenv";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT ?? 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  // Dynamic import for the socket server
  const { createSocketServer, setSocketIO } = await import(
    "./lib/socket/server.mjs"
  );
  const io = createSocketServer(httpServer);
  setSocketIO(io);

  httpServer.listen(port, () => {
    console.log(`AgentTrade running on http://${hostname}:${port}`);
  });
});
