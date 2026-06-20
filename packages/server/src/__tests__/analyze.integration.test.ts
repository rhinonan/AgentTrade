import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../app.module.js";
import { io as ioc, Socket as ClientSocket } from "socket.io-client";
import { createServer, Server as HttpServer } from "node:http";

const TEST_PORT = 3099;

describe("Analyze API Integration", () => {
  let app: INestApplication;
  let httpServer: HttpServer;
  let wsClient: ClientSocket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    httpServer = createServer();
    await app.init();
    // @ts-expect-error — NestJS internal adapter access for testing
    await app.listen(TEST_PORT);
  });

  afterAll(async () => {
    wsClient?.disconnect();
    await app.close();
  });

  it("should return workflow list", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/workflows`);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((w: any) => w.name === "bull-bear")).toBe(true);
    expect(data.some((w: any) => w.name === "quick-scan")).toBe(true);
  });

  it("POST /api/analyze should return sessionId", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "600519", workflow: "bull-bear", provider: "deepseek" }),
    });
    const data = await res.json();
    expect(data.sessionId).toBeDefined();
    expect(typeof data.sessionId).toBe("string");
  });

  it("POST /api/analyze should reject invalid workflow", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "600519", workflow: "invalid-wf" }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("POST /api/analyze should reject request with no target", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow: "bull-bear" }),
    });
    // DTO validation now requires at least one of code, sector, or index
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBeDefined();
    const messages = Array.isArray(data.message) ? data.message : [data.message];
    expect(messages.some((m: string) => m.includes("Must specify at least one of"))).toBe(true);
  });

  it("should receive WS events after subscribing to session", async () => {
    // Start analysis
    const res = await fetch(`http://localhost:${TEST_PORT}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "600519", workflow: "bull-bear", provider: "deepseek" }),
    });
    const { sessionId } = await res.json();

    // Connect WebSocket
    const events: { type: string }[] = [];
    wsClient = ioc(`http://localhost:${TEST_PORT}/analysis`, {
      transports: ["websocket"],
      forceNew: true,
    });

    await new Promise<void>((resolve) => {
      wsClient.on("connect", () => {
        wsClient.emit("subscribe", { sessionId });
        wsClient.on("subscribed", () => resolve());
      });
    });

    // Listen for events
    wsClient.on("analysis:start", (data) => events.push({ type: "analysis:start", ...data }));
    wsClient.on("step:start", (data) => events.push({ type: "step:start", ...data }));
    wsClient.on("step:complete", (data) => events.push({ type: "step:complete", ...data }));
    wsClient.on("analysis:complete", (data) => events.push({ type: "analysis:complete", ...data }));
    wsClient.on("analysis:error", (data) => events.push({ type: "analysis:error", ...data }));

    // Wait for analysis to finish (max 120s for LLM calls)
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        const done = events.find(e => e.type === "analysis:complete" || e.type === "analysis:error");
        if (done) { clearInterval(check); resolve(); }
      }, 500);
      setTimeout(() => { clearInterval(check); resolve(); }, 120_000);
    });

    expect(events.length).toBeGreaterThan(0);
    expect(events.some(e => e.type === "analysis:start")).toBe(true);
    expect(events.some(e => e.type === "analysis:complete") || events.some(e => e.type === "analysis:error")).toBe(true);
  }, 130_000);
});
