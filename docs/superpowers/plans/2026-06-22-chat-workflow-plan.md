# Chat-Integrated Multi-Layer Analysis Workflow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the batch `/api/analyze` workflow into an interactive chat-based system where the user participates as a "散户 Agent" alongside AI agents in a multi-layer analysis.

**Architecture:** New `SessionManager` + `Director` state machine wraps existing `WorkflowScheduler`. All content flows as `ChatMessage` through a new SSE stream. Frontend replaces `/analyze/[id]` page with a chat UI at `/session/[id]`. Existing `/api/analyze` preserved for backward compat.

**Tech Stack:** TypeScript, Next.js 15 (App Router), React 18, Socket.IO 4, better-sqlite3, LangChain (DeepSeek via ChatOpenAI), native SSE (no extra deps), Tailwind CSS 4.

## Global Constraints

- All API routes under `app/api/` follow Next.js App Router conventions
- All new lib files are `.ts` ESM, all React components are `.tsx`
- Existing `/api/analyze` route preserved unchanged
- TDD: every task writes the failing test first, then implementation, then commit
- DB migrations: additive only (new tables), no breaking schema changes
- Agent names and prompts in Chinese

---

### Task 1: ChatMessage Types

**Files:**
- Create: `lib/chat/types.ts`
- Test: `lib/chat/__tests__/types.test.ts`

**Interfaces:**
- Produces: `ChatMessage`, `SessionStatus`, `ChatSession`, `DirectorEvent`, `SSEEvent` types — consumed by all subsequent tasks

- [ ] **Step 1: Write the type definitions**

```ts
// lib/chat/types.ts
import type { Analysis, AnalysisTarget, Finding } from "../engine/types.js";

export type SessionStatus = "RUNNING" | "PAUSED" | "STOPPED";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "agent" | "user" | "system";
  senderId: string;
  senderName: string;
  content: string;
  metadata: {
    type: "analysis" | "critique" | "synthesis" | "interjection" | "step-boundary";
    stepId?: string;
    layer?: string;
    analysis?: Analysis;
    mentionAgentIds?: string[];
    isWorkflowStep?: boolean;
  } | null;
  timestamp: number;
}

export type PendingMessage = Omit<ChatMessage, "id" | "sessionId" | "timestamp">;

export interface ChatSession {
  id: string;
  target: AnalysisTarget;
  workflowName: string;
  status: SessionStatus;
  stepIndex: number;
  findings: Finding[];
  createdAt: number;
}

export interface DirectorEvent {
  type: "step-start" | "step-complete" | "layer-boundary";
  stepId?: string;
  stepType?: string;
  layer?: string;
  agentIds?: string[];
}

export interface SSEEvent {
  event: string;
  data: unknown;
}

export interface CreateSessionInput {
  code?: string;
  sector?: string;
  index?: string;
  workflow?: string;
  provider?: string;
  model?: string;
  dataServiceUrl?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/chat/types.ts && git commit -m "feat(chat): add ChatMessage and session types"
```

---

### Task 2: ChatMessage DB Store

**Files:**
- Create: `lib/db/chat-repo.ts`
- Modify: `lib/db/client.ts` (add `chat_messages` table)
- Test: `lib/db/__tests__/chat-repo.test.ts`

**Interfaces:**
- Consumes: `ChatMessage` from Task 1
- Produces: `ChatRepo` class — `insert(msg)`, `getBySession(sessionId, opts?)`, `getSince(sessionId, timestamp)` — consumed by Task 7 (Session Manager), Task 10 (API routes)

- [ ] **Step 1: Write the failing test**

```ts
// lib/db/__tests__/chat-repo.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { createTables } from "../client.js";
import { ChatRepo } from "../chat-repo.js";

describe("ChatRepo", () => {
  let db: Database.Database;
  let repo: ChatRepo;

  beforeEach(() => {
    db = new Database(":memory:");
    createTables(db);
    repo = new ChatRepo(db);
  });

  it("inserts and retrieves messages for a session", () => {
    const msg = {
      id: "msg-1", sessionId: "s1", role: "agent" as const,
      senderId: "tech-bull", senderName: "牛方", content: "看多",
      metadata: null, timestamp: 1000,
    };
    repo.insert(msg);
    const msgs = repo.getBySession("s1");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe("看多");
  });

  it("returns messages since a given timestamp", () => {
    repo.insert({ id: "m1", sessionId: "s1", role: "agent", senderId: "a", senderName: "A", content: "old", metadata: null, timestamp: 1000 });
    repo.insert({ id: "m2", sessionId: "s1", role: "agent", senderId: "b", senderName: "B", content: "new", metadata: null, timestamp: 2000 });
    const recent = repo.getSince("s1", 1500);
    expect(recent).toHaveLength(1);
    expect(recent[0].content).toBe("new");
  });

  it("deletes messages by session id", () => {
    repo.insert({ id: "m1", sessionId: "s1", role: "agent", senderId: "a", senderName: "A", content: "x", metadata: null, timestamp: 1000 });
    repo.deleteBySession("s1");
    expect(repo.getBySession("s1")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test — expected FAIL (table missing)**

```bash
npx vitest run lib/db/__tests__/chat-repo.test.ts
```

- [ ] **Step 3: Add `chat_messages` table to `createTables`**

```ts
// In lib/db/client.ts, inside createTables(), after the existing CREATE TABLE:

db.exec(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    timestamp INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id, timestamp);
`);
```

- [ ] **Step 4: Implement `ChatRepo`**

```ts
// lib/db/chat-repo.ts
import type Database from "better-sqlite3";
import type { ChatMessage } from "../chat/types.js";

export class ChatRepo {
  constructor(private db: Database.Database) {}

  insert(msg: ChatMessage): void {
    this.db.prepare(
      `INSERT INTO chat_messages (id, session_id, role, sender_id, sender_name, content, metadata, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(msg.id, msg.sessionId, msg.role, msg.senderId, msg.senderName,
      msg.content, msg.metadata ? JSON.stringify(msg.metadata) : null, msg.timestamp);
  }

  getBySession(sessionId: string, opts?: { limit?: number; before?: number }): ChatMessage[] {
    let sql = "SELECT * FROM chat_messages WHERE session_id = ?";
    const params: unknown[] = [sessionId];
    if (opts?.before !== undefined) { sql += " AND timestamp < ?"; params.push(opts.before); }
    sql += " ORDER BY timestamp ASC";
    if (opts?.limit !== undefined) { sql += " LIMIT ?"; params.push(opts.limit); }
    return (this.db.prepare(sql).all(...params) as any[]).map(rowToMessage);
  }

  getSince(sessionId: string, since: number): ChatMessage[] {
    return (this.db.prepare(
      "SELECT * FROM chat_messages WHERE session_id = ? AND timestamp > ? ORDER BY timestamp ASC"
    ).all(sessionId, since) as any[]).map(rowToMessage);
  }

  deleteBySession(sessionId: string): void {
    this.db.prepare("DELETE FROM chat_messages WHERE session_id = ?").run(sessionId);
  }
}

function rowToMessage(row: any): ChatMessage {
  return {
    id: row.id, sessionId: row.session_id, role: row.role,
    senderId: row.sender_id, senderName: row.sender_name,
    content: row.content,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    timestamp: row.timestamp,
  };
}
```

- [ ] **Step 5: Run tests — expected PASS**

```bash
npx vitest run lib/db/__tests__/chat-repo.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add lib/db/client.ts lib/db/chat-repo.ts lib/db/__tests__/chat-repo.test.ts
git commit -m "feat(chat): add chat_messages table and ChatRepo"
```

---

### Task 3: SSE Emitter Utility

**Files:**
- Create: `lib/chat/sse-emitter.ts`
- Test: `lib/chat/__tests__/sse-emitter.test.ts`

**Interfaces:**
- Consumes: `SSEEvent` from Task 1
- Produces: `createSSEEmitter(controller)` → `{ emit, close }` — consumed by Task 7 (Session Manager), Task 10 (stream route)

- [ ] **Step 1: Write the failing test**

```ts
// lib/chat/__tests__/sse-emitter.test.ts
import { describe, it, expect } from "vitest";
import { createSSEEmitter } from "../sse-emitter.js";

describe("createSSEEmitter", () => {
  it("emits SSE-formatted strings for events", () => {
    const chunks: string[] = [];
    const mockController = {
      enqueue(data: Uint8Array) { chunks.push(new TextDecoder().decode(data)); },
    } as any;
    const emitter = createSSEEmitter(mockController);
    emitter.emit("message-start", { messageId: "m1", senderId: "agent-1" });
    emitter.emit("token", { messageId: "m1", token: "hello" });
    const output = chunks.join("");
    expect(output).toContain("event: message-start");
    expect(output).toContain('"messageId":"m1"');
    expect(output).toContain("event: token");
    expect(output).toContain('"token":"hello"');
  });
});
```

- [ ] **Step 2: Run test — expected FAIL**

```bash
npx vitest run lib/chat/__tests__/sse-emitter.test.ts
```

- [ ] **Step 3: Implement SSE emitter**

```ts
// lib/chat/sse-emitter.ts
const encoder = new TextEncoder();

export interface SSEController {
  enqueue(data: Uint8Array): void;
  close(): void;
}

export function createSSEEmitter(controller: SSEController) {
  function emit(event: string, data: unknown): void {
    const lines = [
      `event: ${event}`,
      `data: ${JSON.stringify(data)}`,
      "",
      "",
    ];
    controller.enqueue(encoder.encode(lines.join("\n")));
  }

  function close(): void {
    controller.close();
  }

  return { emit, close };
}
```

- [ ] **Step 4: Run tests — expected PASS**

```bash
npx vitest run lib/chat/__tests__/sse-emitter.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/chat/sse-emitter.ts lib/chat/__tests__/sse-emitter.test.ts
git commit -m "feat(chat): add SSE emitter utility"
```

---

### Task 4: Agent `layer` Property

**Files:**
- Modify: `lib/engine/types.ts` (add `layer` to `BaseAgent`)
- Modify: `lib/agents/index.ts` (set `layer` on every registration)

**Interfaces:**
- Consumes: existing `BaseAgent` interface
- Produces: updated `BaseAgent.layer: string` — consumed by Director (Task 6), frontend (Tasks 12-15)

- [ ] **Step 1: Add `layer` to `BaseAgent`**

```ts
// In lib/engine/types.ts, add to BaseAgent interface (after `capabilities`):
export interface BaseAgent {
  id: string;
  name: string;
  capabilities: Capability[];
  layer?: string;  // "perception" | "analysis" | "decision" | "execution"
  personality: AgentPersona;
  tools: StructuredTool[];
  analyze(context: ExecutionContext): Promise<Analysis>;
  canCritique?: boolean;
  canDebate?: boolean;
}
```

- [ ] **Step 2: Set `layer` on all agent registrations in `lib/agents/index.ts`**

In `registerBuiltinAgents`, add `layer` to each constructor call where applicable. Only agents instantiated with a class that supports a `layer` property need it. Add `layer` to the agent class constructors:

```ts
// In each agent class constructor, add:
// this.layer = config.layer ?? "analysis";

// Example — in TechnicalAnalystAgent constructor:
// this.layer = config.layer ?? "analysis";

// Then in registerBuiltinAgents, registry.register calls stay unchanged;
// the default layer per class handles it.
```

Actually, since `BaseAgent` interface now has `layer?:`, we in-place set it per class. Add to each agent class:

```ts
// lib/agents/technical.ts — add line after `this.capabilities = ...`:
this.layer = "analysis";

// lib/agents/fundamental.ts — add:
this.layer = "analysis";

// lib/agents/judge.ts — add:
this.layer = "decision";

// lib/agents/perception.ts — in all 5 classes, add:
this.layer = "perception";

// lib/agents/extended-analysis.ts — in all 4 classes, add:
this.layer = "analysis";

// lib/agents/decision.ts — in all 4 classes, add:
this.layer = "decision";

// lib/agents/execution.ts — in all 4 classes, add:
this.layer = "execution";
```

- [ ] **Step 3: Verify existing tests still pass**

```bash
npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add lib/engine/types.ts lib/agents/technical.ts lib/agents/fundamental.ts lib/agents/judge.ts lib/agents/perception.ts lib/agents/extended-analysis.ts lib/agents/decision.ts lib/agents/execution.ts lib/agents/index.ts
git commit -m "feat(agents): add layer property to all agents"
```

---

### Task 5: Director State Machine

**Files:**
- Create: `lib/chat/director.ts`
- Test: `lib/chat/__tests__/director.test.ts`

**Interfaces:**
- Consumes: `ChatMessage`, `PendingMessage`, `SessionStatus`, `DirectorEvent` from Task 1; `WorkflowDAG`, `WorkflowStep`, `Finding` from engine; `AgentRegistry`; `AnalyzeOptions`
- Produces: `Director` class — `advance()`, `pause()`, `resume()`, `status` getter — consumed by Task 7 (Session Manager)

- [ ] **Step 1: Write the failing test**

```ts
// lib/chat/__tests__/director.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { Director } from "../director.js";
import { AgentRegistry } from "../../engine/registry.js";
import { registerBuiltinAgents } from "../../agents/index.js";
import type { WorkflowDAG } from "../../engine/types.js";

const miniDag: WorkflowDAG = {
  name: "test", version: "1",
  steps: [
    { id: "step1", type: "analyze", agent: { id: "technical-bull" }, prompt: "分析 {target}" },
    { id: "step2", type: "analyze", agent: { id: "technical-bear" }, prompt: "看空 {target}" },
  ],
};

describe("Director", () => {
  let registry: AgentRegistry;
  let director: Director;

  beforeEach(() => {
    registry = new AgentRegistry();
    registerBuiltinAgents(registry);
    director = new Director(miniDag, { provider: "deepseek" });
  });

  it("starts in RUNNING state", () => {
    expect(director.status).toBe("RUNNING");
  });

  it("advance() emits a system step-boundary message for the first step", async () => {
    const messages: any[] = [];
    const result = await director.advance("s1", [], [], async (msg) => { messages.push(msg); });
    expect(messages.length).toBeGreaterThanOrEqual(1);
    const systemMsg = messages.find((m: any) => m.role === "system");
    expect(systemMsg).toBeDefined();
    expect(systemMsg.metadata?.type).toBe("step-boundary");
    expect(result.hasMore).toBe(true);
  });

  it("pause() changes status to PAUSED", () => {
    director.pause();
    expect(director.status).toBe("PAUSED");
  });

  it("resume() changes status back to RUNNING", () => {
    director.pause();
    director.resume();
    expect(director.status).toBe("RUNNING");
  });

  it("returns hasMore=false after all steps exhausted", async () => {
    const messages: any[] = [];
    let result = await director.advance("s1", [], [], async (msg) => { messages.push(msg); });
    result = await director.advance("s1", [], messages, async (msg) => { messages.push(msg); });
    expect(result.hasMore).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expected FAIL**

```bash
npx vitest run lib/chat/__tests__/director.test.ts
```

- [ ] **Step 3: Implement Director**

```ts
// lib/chat/director.ts
import { randomUUID } from "node:crypto";
import type { WorkflowDAG, WorkflowStep, Finding, ExecutionContext, AnalysisTarget } from "../engine/types.js";
import type { PendingMessage, SessionStatus } from "./types.js";
import type { AnalyzeOptions } from "../llm/create-llm.js";
import { createLLM } from "../llm/create-llm.js";
import { parseLLMJson, parseSentiment } from "../llm/parse.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export class Director {
  status: SessionStatus = "RUNNING";
  private stepIndex = 0;
  private dag: WorkflowDAG;
  private options: AnalyzeOptions;

  constructor(dag: WorkflowDAG, options: AnalyzeOptions = {}) {
    this.dag = dag;
    this.options = options;
  }

  pause(): void {
    if (this.status === "RUNNING") this.status = "PAUSED";
  }

  resume(): void {
    if (this.status === "PAUSED") this.status = "RUNNING";
  }

  stop(): void {
    this.status = "STOPPED";
  }

  async advance(
    target: AnalysisTarget,
    findings: Finding[],
    history: { senderId: string; senderName: string; content: string }[],
    onMessage: (msg: PendingMessage) => Promise<void>,
  ): Promise<{ hasMore: boolean }> {
    if (this.status === "PAUSED" || this.status === "STOPPED") {
      return { hasMore: this.status !== "STOPPED" };
    }

    if (this.stepIndex >= this.dag.steps.length) {
      this.status = "STOPPED";
      await onMessage({
        role: "system", senderId: "director", senderName: "导演",
        content: "分析流程已完成",
        metadata: { type: "step-boundary" },
      });
      return { hasMore: false };
    }

    const step = this.dag.steps[this.stepIndex];
    const layer = this.inferLayer(step);

    // Emit layer boundary if entering a new layer
    if (layer && (this.stepIndex === 0 || this.inferLayer(this.dag.steps[this.stepIndex - 1]) !== layer)) {
      const layerNames: Record<string, string> = {
        perception: "数据感知层", analysis: "分析层", decision: "决策层", execution: "执行与风控层",
      };
      await onMessage({
        role: "system", senderId: "director", senderName: "导演",
        content: `进入「${layerNames[layer] ?? layer}」`,
        metadata: { type: "step-boundary", layer },
      });
    }

    // Execute step
    await this.executeStep(step, target, findings, history, onMessage);
    this.stepIndex++;

    const hasMore = this.stepIndex < this.dag.steps.length;
    return { hasMore };
  }

  private async executeStep(
    step: WorkflowStep,
    target: AnalysisTarget,
    findings: Finding[],
    history: { senderId: string; senderName: string; content: string }[],
    onMessage: (msg: PendingMessage) => Promise<void>,
  ): Promise<void> {
    switch (step.type) {
      case "analyze": return this.execAnalyze(step, target, findings, history, onMessage);
      case "panel": return this.execPanel(step, target, findings, history, onMessage);
      case "synthesize": return this.execSynthesize(step, target, findings, onMessage);
      case "critique": return this.execCritique(step, target, findings, onMessage);
      case "debate": return this.execDebate(step, target, findings, onMessage);
      case "parallel": {
        if (!step.children) return;
        for (const child of step.children) {
          await this.executeStep(child, target, findings, history, onMessage);
        }
        return;
      }
      case "sequential": {
        if (!step.children) return;
        for (const child of step.children) {
          await this.executeStep(child, target, findings, history, onMessage);
        }
        return;
      }
      default: return;
    }
  }

  private async execAnalyze(
    step: WorkflowStep, target: AnalysisTarget, findings: Finding[],
    history: { senderId: string; senderName: string; content: string }[],
    onMessage: (msg: PendingMessage) => Promise<void>,
  ): Promise<void> {
    const agentMatch = Array.isArray(step.agent) ? step.agent[0] : step.agent;
    const agentId = agentMatch?.id;
    if (!agentId) throw new Error(`Analyze step "${step.id}" requires agent.id`);
    const prompt = (step.prompt ?? "分析 {target}").replace("{target}", target.name ?? target.code);
    await this.invokeAgent(agentId, prompt, target, findings, history, onMessage, step);
  }

  private async execPanel(
    step: WorkflowStep, target: AnalysisTarget, findings: Finding[],
    history: { senderId: string; senderName: string; content: string }[],
    onMessage: (msg: PendingMessage) => Promise<void>,
  ): Promise<void> {
    const agentMatches = (Array.isArray(step.agent) ? step.agent : [step.agent]).filter(Boolean);
    const prompt = (step.prompt ?? "分析 {target}").replace("{target}", target.name ?? target.code);
    await Promise.all(agentMatches.map(m =>
      this.invokeAgent(m.id!, prompt, target, findings, history, onMessage, step)
    ));
  }

  private async execSynthesize(
    step: WorkflowStep, target: AnalysisTarget, findings: Finding[],
    onMessage: (msg: PendingMessage) => Promise<void>,
  ): Promise<void> {
    const agentMatch = Array.isArray(step.agent) ? step.agent[0] : step.agent;
    const agentId = agentMatch?.id;
    if (!agentId) throw new Error("Synthesize requires agent.id");
    const allFindingsText = findings.map(f =>
      `[${f.agent}](${f.analysis.sentiment}, conf=${f.analysis.confidence}): ${f.analysis.conclusion}`
    ).join("\n");
    const prompt = `${step.prompt ?? "综合所有分析"}\n\n已有分析：\n${allFindingsText}`;
    await this.invokeAgent(agentId, prompt, target, findings, [], onMessage, step);
  }

  private async execCritique(
    step: WorkflowStep, target: AnalysisTarget, findings: Finding[],
    onMessage: (msg: PendingMessage) => Promise<void>,
  ): Promise<void> {
    const agentMatch = Array.isArray(step.agent) ? step.agent[0] : step.agent;
    const agentId = agentMatch?.id;
    if (!agentId) throw new Error("Critique requires agent.id");
    const targetFindings = findings.filter(f => f.step === step.targetStep);
    const targetText = targetFindings.map(f =>
      `[${f.agent}]: ${f.analysis.conclusion}\n理由: ${f.analysis.reasoning.join("; ")}`
    ).join("\n");
    const prompt = `${step.prompt ?? "审阅以下分析"}\n\n待审阅：\n${targetText}`;
    await this.invokeAgent(agentId, prompt, target, findings, [], onMessage, step);
  }

  private async execDebate(
    step: WorkflowStep, target: AnalysisTarget, findings: Finding[],
    onMessage: (msg: PendingMessage) => Promise<void>,
  ): Promise<void> {
    const agentMatches = (Array.isArray(step.agent) ? step.agent : [step.agent]).filter(Boolean) as { id: string }[];
    const maxRounds = step.maxRounds ?? 2;
    const debateHistory: { agent: string; argument: string }[] = [];
    for (let r = 0; r < maxRounds; r++) {
      for (const match of agentMatches) {
        const othersText = debateHistory.map(e => `[${e.agent}]: ${e.argument}`).join("\n");
        const prompt = `辩论轮次 ${r + 1}/${maxRounds}。${step.prompt ?? "就分析结论进行辩论"}\n${othersText ? `\n对方观点：\n${othersText}` : ""}`;
        await this.invokeAgent(match.id, prompt, target, findings, [], onMessage, step);
      }
    }
  }

  private async invokeAgent(
    agentId: string, prompt: string, target: AnalysisTarget,
    findings: Finding[],
    history: { senderId: string; senderName: string; content: string }[],
    onMessage: (msg: PendingMessage) => Promise<void>,
    step?: WorkflowStep,
  ): Promise<void> {
    const llm = createLLM(this.options);
    const historyText = history.map(h => `[${h.senderName}]: ${h.content}`).join("\n");
    const allFindingsText = findings.map(f =>
      `[${f.agent}](${f.analysis.sentiment}): ${f.analysis.conclusion}`
    ).join("\n");

    const systemPrompt = `你是${agentId}。请用中文回复。${step?.prompt ? `任务：${step.prompt.replace("{target}", target.name ?? target.code)}` : ""}
输出JSON格式：{"conclusion":"你的结论","confidence":0.0-1.0,"sentiment":"bullish|bearish|neutral","reasoning":["论据1","论据2","论据3"]}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`${prompt}${historyText ? `\n\n对话历史：\n${historyText}` : ""}${allFindingsText ? `\n\n已有分析结论：\n${allFindingsText}` : ""}`),
    ];

    const response = await llm.invoke(messages);
    const text = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

    try {
      const parsed = parseLLMJson(text) as Record<string, unknown>;
      await onMessage({
        role: "agent", senderId: agentId, senderName: agentId, content: text,
        metadata: {
          type: "analysis", stepId: step?.id, isWorkflowStep: true,
          analysis: {
            conclusion: (parsed.conclusion as string) ?? text.slice(0, 200),
            confidence: Math.max(0, Math.min(1, (parsed.confidence as number) ?? 0.5)),
            sentiment: parseSentiment(parsed.sentiment),
            reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning as string[] : [(parsed.reasoning as string) ?? ""],
            rawOutput: text,
          },
        },
      });
    } catch {
      await onMessage({
        role: "agent", senderId: agentId, senderName: agentId, content: text,
        metadata: { type: "analysis", stepId: step?.id, isWorkflowStep: true },
      });
    }
  }

  private inferLayer(step: WorkflowStep): string | undefined {
    if (step.id.startsWith("perception")) return "perception";
    if (step.id.startsWith("analysis")) return "analysis";
    if (step.id.startsWith("decision")) return "decision";
    if (step.id.startsWith("execution")) return "execution";
    return undefined;
  }
}
```

- [ ] **Step 4: Run tests — expected PASS**

```bash
npx vitest run lib/chat/__tests__/director.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/chat/director.ts lib/chat/__tests__/director.test.ts
git commit -m "feat(chat): add Director state machine"
```

---

### Task 6: Session Manager

**Files:**
- Create: `lib/chat/session-manager.ts`
- Test: `lib/chat/__tests__/session-manager.test.ts`

**Interfaces:**
- Consumes: `ChatMessage`, `ChatSession`, `PendingMessage`, `SessionStatus`, `CreateSessionInput` from Task 1; `Director` from Task 5; `ChatRepo` from Task 2; `SSEController` from Task 3
- Produces: `SessionManager` singleton — `createSession()`, `handleUserMessage()`, `resumeSession()`, `getSession()` — consumed by API routes (Tasks 8-10)

- [ ] **Step 1: Write the failing test**

```ts
// lib/chat/__tests__/session-manager.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { SessionManager } from "../session-manager.js";
import { ChatRepo } from "../../db/chat-repo.js";
import { AgentRegistry } from "../../engine/registry.js";
import { registerBuiltinAgents } from "../../agents/index.js";
import type { WorkflowDAG } from "../../engine/types.js";
import Database from "better-sqlite3";
import { createTables } from "../../db/client.js";

const testDag: WorkflowDAG = {
  name: "test", version: "1",
  steps: [
    { id: "perception-1", type: "analyze", agent: { id: "market-data" }, prompt: "采集 {target} 行情" },
  ],
};

describe("SessionManager", () => {
  let db: Database.Database;
  let repo: ChatRepo;
  let registry: AgentRegistry;

  beforeEach(() => {
    db = new Database(":memory:");
    createTables(db);
    repo = new ChatRepo(db);
    registry = new AgentRegistry();
    registerBuiltinAgents(registry);
  });

  it("creates a session and starts in RUNNING", () => {
    const mgr = new SessionManager(repo);
    const session = mgr.createSession("s1", { code: "000001" }, testDag, registry, { provider: "deepseek" });
    expect(session.status).toBe("RUNNING");
  });

  it("handleUserMessage without @mentions returns user message only", async () => {
    const mgr = new SessionManager(repo);
    mgr.createSession("s1", { code: "000001" }, testDag, registry, { provider: "deepseek" });
    const msgs = await mgr.handleUserMessage("s1", "hello");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe("user");
  });

  it("resumeSession changes PAUSED to RUNNING and advances director", async () => {
    const mgr = new SessionManager(repo);
    mgr.createSession("s1", { code: "000001" }, testDag, registry, { provider: "deepseek" });
    // Send message to trigger pause
    await mgr.handleUserMessage("s1", "@market-data what?");
    const session = mgr.getSession("s1");
    expect(session?.status).toBe("PAUSED");
    // Resume
    const msgs = await mgr.resumeSession("s1");
    expect(mgr.getSession("s1")?.status).toBe("RUNNING");
  });
});
```

- [ ] **Step 2: Run test — expected FAIL**

```bash
npx vitest run lib/chat/__tests__/session-manager.test.ts
```

- [ ] **Step 3: Implement SessionManager**

```ts
// lib/chat/session-manager.ts
import { randomUUID } from "node:crypto";
import type { ChatMessage, ChatSession, CreateSessionInput, SessionStatus } from "./types.js";
import { Director } from "./director.js";
import type { ChatRepo } from "../db/chat-repo.js";
import type { AgentRegistry } from "../engine/registry.js";
import type { WorkflowDAG, AnalysisTarget, Finding } from "../engine/types.js";
import type { AnalyzeOptions } from "../llm/create-llm.js";
import { DataClient } from "../data/client.js";
import { createLLM } from "../llm/create-llm.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export class SessionManager {
  private sessions = new Map<string, {
    session: ChatSession;
    director: Director;
    dag: WorkflowDAG;
    registry: AgentRegistry;
    options: AnalyzeOptions;
    _advancing: boolean;
  }>();

  constructor(private repo: ChatRepo) {}

  createSession(
    id: string,
    input: CreateSessionInput,
    dag: WorkflowDAG,
    registry: AgentRegistry,
    options: AnalyzeOptions = {},
  ): ChatSession {
    const target: AnalysisTarget = input.code
      ? { type: "stock", code: input.code }
      : input.sector ? { type: "sector", code: input.sector }
      : { type: "index", code: input.index! };

    const session: ChatSession = {
      id, target, workflowName: dag.name,
      status: "RUNNING", stepIndex: 0, findings: [], createdAt: Date.now(),
    };

    const director = new Director(dag, options);
    this.sessions.set(id, { session, director, dag, registry, options, _advancing: false });
    return session;
  }

  getSession(id: string): ChatSession | undefined {
    return this.sessions.get(id)?.session;
  }

  deleteSession(id: string): void {
    this.sessions.delete(id);
  }

  getDirector(id: string): Director | undefined {
    return this.sessions.get(id)?.director;
  }

  async handleUserMessage(
    sessionId: string,
    content: string,
    mentionAgentIds: string[] = [],
  ): Promise<ChatMessage[]> {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error(`Session ${sessionId} not found`);
    const { session, director, registry } = entry;

    const now = Date.now();
    const userMsg: ChatMessage = {
      id: randomUUID(), sessionId, role: "user", senderId: "user",
      senderName: "散户", content,
      metadata: mentionAgentIds.length > 0
        ? { type: "interjection", mentionAgentIds }
        : { type: "interjection" },
      timestamp: now,
    };
    this.repo.insert(userMsg);
    const outMessages: ChatMessage[] = [userMsg];

    // If user @mentioned agents, pause director and respond
    if (mentionAgentIds.length > 0) {
      director.pause();
      session.status = "PAUSED";

      const history = this.repo.getBySession(sessionId);
      for (const agentId of mentionAgentIds) {
        const agent = entry.registry.get(agentId);
        if (!agent) continue;
        const llm = createLLM(entry.options);
        const historyText = history
          .slice(-20)
          .map(h => `[${h.senderName}]: ${h.content}`)
          .join("\n");

        const response = await llm.invoke([
          new SystemMessage(`你是${agent.name}。立场${agent.personality.stance}。请用中文回复。`),
          new HumanMessage(`${content}\n\n对话历史：\n${historyText}`),
        ]);
        const respText = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

        const agentMsg: ChatMessage = {
          id: randomUUID(), sessionId, role: "agent",
          senderId: agentId, senderName: agent.name, content: respText,
          metadata: { type: "interjection", mentionAgentIds: [agentId] },
          timestamp: Date.now(),
        };
        this.repo.insert(agentMsg);
        outMessages.push(agentMsg);
      }
    }

    return outMessages;
  }

  async resumeSession(sessionId: string): Promise<ChatMessage[]> {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error(`Session ${sessionId} not found`);
    const { session, director, registry, options } = entry;
    director.resume();
    session.status = "RUNNING";

    const outMessages: ChatMessage[] = [];
    const history = this.repo.getBySession(sessionId);

    const result = await director.advance(
      session.target,
      session.findings,
      history.map(h => ({ senderId: h.senderId, senderName: h.senderName, content: h.content })),
      async (pending) => {
        const msg: ChatMessage = {
          id: randomUUID(), sessionId, ...pending, timestamp: Date.now(),
        };
        this.repo.insert(msg);
        outMessages.push(msg);
      },
    );

    if (!result.hasMore) {
      session.status = "STOPPED";
    }

    return outMessages;
  }

  /** Fire-and-forget: advance through all steps while RUNNING. Stops on PAUSED/STOPPED. */
  startAutoAdvance(sessionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) return;
    if (entry._advancing) return; // guard against double-start
    entry._advancing = true;

    const loop = async () => {
      while (true) {
        const e = this.sessions.get(sessionId);
        if (!e || e.director.status !== "RUNNING") break;
        const { session, director } = e;
        const history = this.repo.getBySession(sessionId);
        const result = await director.advance(
          session.target,
          session.findings,
          history.map(h => ({ senderId: h.senderId, senderName: h.senderName, content: h.content })),
          async (pending) => {
            this.repo.insert({
              id: randomUUID(), sessionId, ...pending, timestamp: Date.now(),
            });
          },
        );
        if (!result.hasMore) { session.status = "STOPPED"; break; }
      }
      if (e) e._advancing = false;
    };

    loop().catch(err => {
      console.error(`Session ${sessionId} auto-advance failed:`, err);
      const e = this.sessions.get(sessionId);
      if (e) { e.session.status = "STOPPED"; e._advancing = false; }
    });
  }
}
```

- [ ] **Step 4: Run tests — expected PASS**

```bash
npx vitest run lib/chat/__tests__/session-manager.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/chat/session-manager.ts lib/chat/__tests__/session-manager.test.ts
git commit -m "feat(chat): add SessionManager"
```

---

### Task 7: SSE Stream Route

**Files:**
- Create: `app/api/session/[id]/messages/stream/route.ts`

**Interfaces:**
- Consumes: `SessionManager` from Task 6, `SSEController` from Task 3, `getDb` from `lib/db/client`, `ChatRepo` from Task 2
- Produces: `GET /api/session/:id/messages/stream` — SSE endpoint consumed by `useChatStream` hook (Task 12)

- [ ] **Step 1: Write the SSE route**

```ts
// app/api/session/[id]/messages/stream/route.ts
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

      // Passive observer: poll DB for new messages and session status every 500ms
      let lastTimestamp = Date.now();
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return; }
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
          }
          if (currentSession?.status === "STOPPED") {
            emitter.emit("status-change", { status: "STOPPED" });
            emitter.close();
            clearInterval(interval);
          }
        } catch { /* ignore */ }
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
```

Wait — the SessionManager is currently created per-request. We need a singleton. Let me fix the approach: use a module-level `Map` keyed by an in-memory reference.

Let me redesign: The SessionManager needs to be a module-level singleton, not tied to the ChatRepo lifecycle. Refactor in Step 2.

- [ ] **Step 2: Make SessionManager a module-level singleton**

```ts
// In lib/chat/session-manager.ts, add at end of file:
let _instance: SessionManager | null = null;

export function getSessionManager(repo?: ChatRepo): SessionManager {
  if (!_instance) {
    if (!repo) throw new Error("SessionManager not initialized — pass ChatRepo on first call");
    _instance = new SessionManager(repo);
  }
  return _instance;
}

export function resetSessionManager(): void {
  _instance = null;
}
```

Then in the SSE route, use the singleton.

- [ ] **Step 3: Re-run tests to confirm singleton works**

```bash
npx vitest run lib/chat/__tests__/session-manager.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add app/api/session/ lib/chat/session-manager.ts
git commit -m "feat(chat): add SSE stream route + SessionManager singleton"
```

---

### Task 8: Session API Routes (Create + Delete)

**Files:**
- Create: `app/api/session/route.ts`
- Test: `app/api/session/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `SessionManager` (Task 6), `WORKFLOWS` (existing), `AgentRegistry` (existing)
- Produces: `POST /api/session`, `DELETE /api/session/:id`

- [ ] **Step 1: Write the API route**

```ts
// app/api/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { WORKFLOWS } from "@/lib/workflows/index.js";
import { AgentRegistry } from "@/lib/engine/registry.js";
import { registerBuiltinAgents } from "@/lib/agents/index.js";
import { getDb } from "@/lib/db/client.js";
import { ChatRepo } from "@/lib/db/chat-repo.js";
import { getSessionManager } from "@/lib/chat/session-manager.js";
import { setDefaultLLMProvider } from "@/lib/llm/create-llm.js";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, sector, index, workflow = "layered", provider = "deepseek", model } = body;

  if (!code && !sector && !index) {
    return NextResponse.json({ error: "Must specify code, sector, or index" }, { status: 400 });
  }

  const dag = WORKFLOWS[workflow];
  if (!dag) {
    return NextResponse.json({ error: `Unknown workflow: ${workflow}` }, { status: 400 });
  }

  const sessionId = randomUUID();
  const db = getDb();
  const repo = new ChatRepo(db);
  const mgr = getSessionManager(repo);

  if (provider) setDefaultLLMProvider(provider as any);

  const registry = new AgentRegistry();
  registerBuiltinAgents(registry);

  const session = mgr.createSession(sessionId, { code, sector, index, workflow, provider, model }, dag, registry, { provider, modelName: model });

  // Start director advancing immediately (fire-and-forget loop until PAUSED/STOPPED)
  mgr.startAutoAdvance(sessionId);

  const agents = registry.list().map(a => ({ id: a.id, name: a.name, capabilities: a.capabilities, layer: a.layer }));

  return NextResponse.json({ sessionId, agents, workflow: dag.name });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || url.pathname.split("/").pop();
  if (!id) return NextResponse.json({ error: "Missing session id" }, { status: 400 });

  const mgr = getSessionManager();
  mgr.deleteSession(id);
  return NextResponse.json({ deleted: true });
}
```

- [ ] **Step 2: Write test for POST**

```ts
// app/api/session/__tests__/route.test.ts
import { describe, it, expect } from "vitest";

describe("POST /api/session", () => {
  it("returns 400 when no code/sector/index provided", async () => {
    const { POST } = await import("../route.js");
    const req = new Request("http://localhost:3000/api/session", {
      method: "POST", body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns sessionId for valid code", async () => {
    const { POST } = await import("../route.js");
    const req = new Request("http://localhost:3000/api/session", {
      method: "POST", body: JSON.stringify({ code: "000001" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBeDefined();
    expect(body.agents).toBeInstanceOf(Array);
    expect(body.agents.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run app/api/session/__tests__/route.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add app/api/session/
git commit -m "feat(chat): add POST/DELETE /api/session routes"
```

---

### Task 9: Message API Routes (Send + History)

**Files:**
- Create: `app/api/session/[id]/message/route.ts`
- Create: `app/api/session/[id]/messages/route.ts` (history)

**Interfaces:**
- Consumes: `SessionManager` (Task 6)
- Produces: `POST /api/session/:id/message`, `GET /api/session/:id/messages`

- [ ] **Step 1: Write POST message route**

```ts
// app/api/session/[id]/message/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionManager } from "@/lib/chat/session-manager.js";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const { content, mentionAgentIds } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const mgr = getSessionManager();
  const session = mgr.getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const messages = await mgr.handleUserMessage(sessionId, content, mentionAgentIds ?? []);
  return NextResponse.json({ messages });
}
```

- [ ] **Step 2: Write GET history route**

```ts
// app/api/session/[id]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client.js";
import { ChatRepo } from "@/lib/db/chat-repo.js";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);

  const db = getDb();
  const repo = new ChatRepo(db);
  const before = cursor ? repo.getById(cursor)?.timestamp : undefined;
  const messages = repo.getBySession(sessionId, { limit: limit + 1, before });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  return NextResponse.json({ messages, hasMore, nextCursor: hasMore ? messages[messages.length - 1]?.id : null });
}
```

Wait — `ChatRepo.getById` doesn't exist. Let me add it to ChatRepo in Task 2. Actually, let me make the history pagination simpler: use `offset` instead of cursor, or add `getById`. Let me add `getById` to ChatRepo now:

```ts
// Add to ChatRepo in lib/db/chat-repo.ts:
getById(id: string): ChatMessage | undefined {
  const row = this.db.prepare("SELECT * FROM chat_messages WHERE id = ?").get(id) as any;
  return row ? rowToMessage(row) : undefined;
}
```

- [ ] **Step 3: Run any existing tests to confirm nothing breaks**

```bash
npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add app/api/session/ lib/db/chat-repo.ts
git commit -m "feat(chat): add message send + history API routes"
```

---

### Task 10: Layered Workflow Definition

**Files:**
- Create: `lib/workflows/layered.ts`
- Modify: `lib/workflows/index.ts`

**Interfaces:**
- Consumes: builder primitives from `lib/engine/builder`
- Produces: `layeredWorkflow: WorkflowDAG` — consumed by Session API (Task 8)

- [ ] **Step 1: Define the layered workflow**

```ts
// lib/workflows/layered.ts
import { defineWorkflow, analyze, parallel, sequential, critique, synthesize, debate } from "../engine/builder.js";

export const layeredWorkflow = defineWorkflow({
  name: "layered",
  description: "四层对抗分析：感知→分析→决策→执行风控",
})
  // ====== Layer 1: 数据感知层 ======
  .step("perception-data", parallel([
    analyze({
      agent: { id: "market-data" },
      prompt: "采集 {target} 的实时行情数据：价格、涨跌幅、成交量、换手率、振幅。识别关键价格位和异常波动。",
    }),
    analyze({
      agent: { id: "sentiment-bull" },
      prompt: "从乐观角度扫描 {target} 的市场舆情：社交媒体情绪、新闻标题倾向、分析师评级变化。",
    }),
    analyze({
      agent: { id: "sentiment-bear" },
      prompt: "从谨慎角度扫描 {target} 的市场舆情：负面新闻、看空报告、风险提示。",
    }),
    analyze({
      agent: { id: "macro-data" },
      prompt: "采集影响 {target} 的宏观指标：利率、汇率、PMI、CPI、政策动态。",
    }),
    analyze({
      agent: { id: "capital-flow" },
      prompt: "采集 {target} 的资金流向数据：主力净流入/流出、北向资金、大单动向、融资融券余额。",
    }),
    analyze({
      agent: { id: "institutional" },
      prompt: "采集 {target} 的机构动向：基金持仓变化、大宗交易、龙虎榜动向。",
    }),
  ]))
  // ====== Layer 2: 分析层 ======
  .step("analysis-bull-panel", parallel([
    analyze({
      agent: { id: "technical-bull" },
      prompt: "从技术面看多 {target}：均线多头排列、MACD金叉、放量突破、支撑位企稳。给出3条多头的核心理由。",
    }),
    analyze({
      agent: { id: "financial-bull" },
      prompt: "从基本面看多 {target}：盈利增长、估值合理、行业景气、竞争优势。给出3条看多的核心理由。",
    }),
    analyze({
      agent: { id: "valuation-bull" },
      prompt: "从估值角度看多 {target}：PE/PB分位、DCF估值、同业对比、成长性溢价。",
    }),
    analyze({
      agent: { id: "pattern-bull" },
      prompt: "从形态识别看多 {target}：底部反转形态、突破形态、趋势延续信号。",
    }),
    analyze({
      agent: { id: "volume-bull" },
      prompt: "从量价关系看多 {target}：放量上涨、缩量调整、量价配合度。",
    }),
  ]))
  .step("analysis-bear-panel", parallel([
    analyze({
      agent: { id: "technical-bear" },
      prompt: "从技术面看空 {target}：死叉、破位、顶背离、缩量反弹。给出3条看空的核心理由。",
    }),
    analyze({
      agent: { id: "financial-bear" },
      prompt: "从基本面看空 {target}：盈利下滑、估值泡沫、行业衰退、竞争威胁。给出3条看空的核心理由。",
    }),
    analyze({
      agent: { id: "valuation-bear" },
      prompt: "从估值角度看空 {target}：高估风险、盈利下调预期、现金流恶化。",
    }),
    analyze({
      agent: { id: "pattern-bear" },
      prompt: "从形态识别看空 {target}：顶部反转形态、破位下行、下跌中继。",
    }),
    analyze({
      agent: { id: "volume-bear" },
      prompt: "从量价关系看空 {target}：放量下跌、缩量反弹、主力出货迹象。",
    }),
  ]))
  .step("analysis-event", analyze({
    agent: { id: "event-driven" },
    prompt: "分析影响 {target} 的近期事件：财报发布、政策变化、行业事件、突发事件。评估事件的短期和中期影响。",
  }))
  .step("analysis-cross-critique", parallel([
    critique({
      reviewer: "technical-bull",
      targetStep: "analysis-bear-panel",
      prompt: "作为牛方，逐条审阅熊方的看空理由。哪些论据不够有力？哪些风险被夸大？请具体反驳。",
    }),
    critique({
      reviewer: "technical-bear",
      targetStep: "analysis-bull-panel",
      prompt: "作为熊方，逐条审阅牛方的看多理由。哪些信号是假突破？哪些利好已被定价？请具体反驳。",
    }),
  ]))
  // ====== Layer 3: 决策层 ======
  .step("decision-judge", synthesize({
    agent: "judge",
    prompt: "综合感知层数据和多空双方分析及互驳，对 {target} 做出综合研判。给出核心结论和关键论据。",
  }))
  .step("decision-quant", analyze({
    agent: { id: "quant-analyst" },
    prompt: "基于前面的分析，从量化角度评估 {target}：风险收益比、波动率预期、胜率评估、最大回撤预估。",
  }))
  .step("decision-portfolio", analyze({
    agent: { id: "portfolio-mgr" },
    prompt: "给出 {target} 的仓位配置建议：建议仓位比例、加仓/减仓条件、组合中的角色定位。",
  }))
  .step("decision-timing", parallel([
    analyze({
      agent: { id: "timing-aggressive" },
      prompt: "从激进角度给出 {target} 的买入时机和卖出时机建议：突破追入还是回调低吸？",
    }),
    analyze({
      agent: { id: "timing-conservative" },
      prompt: "从保守角度给出 {target} 的买入时机和卖出时机建议：等待确认信号还是观望？",
    }),
  ]))
  .step("decision-hedging", analyze({
    agent: { id: "hedging" },
    prompt: "为 {target} 的持仓设计对冲方案：可用的对冲工具、对冲比例、触发条件。",
  }))
  // ====== Layer 4: 执行与风控层 ======
  .step("execution-plan", analyze({
    agent: { id: "execution" },
    prompt: "制定 {target} 的具体执行计划：下单方式（市价/限价）、分批建仓节奏、执行时间窗口。",
  }))
  .step("execution-risk", analyze({
    agent: { id: "risk-ctrl" },
    prompt: "设定 {target} 的风控参数：止损位、止盈位、最大回撤容忍度、仓位上限。",
  }))
  .step("execution-debate", debate({
    agents: [{ id: "execution" }, { id: "risk-ctrl" }],
    maxRounds: 2,
    prompt: "执行Agent和风控Agent就 {target} 的仓位比例和止损位进行讨论。执行Agent倾向于更积极的操作，风控Agent强调风险控制。请各自阐述理由并尝试达成共识。",
  }))
  .step("execution-compliance", analyze({
    agent: { id: "compliance" },
    prompt: "检查 {target} 的交易计划是否合规：是否触及交易限制、信息披露要求、内部交易规则。",
  }))
  .step("execution-cost", analyze({
    agent: { id: "cost-optimizer" },
    prompt: "优化 {target} 的交易成本：滑点预估、手续费、印花税影响、最优执行算法建议。",
  }))
  // ====== Final ======
  .step("final", synthesize({
    agent: "judge",
    prompt: "综合四层所有分析（感知→分析→决策→执行风控），给出 {target} 的最终投资方案。包括：总体研判、仓位建议、买卖时机、风控参数、执行计划。",
  }))
  .build();
```

- [ ] **Step 2: Register in workflows index**

```ts
// In lib/workflows/index.ts, add:
import { layeredWorkflow } from "./layered.js";

export const WORKFLOWS: Record<string, WorkflowDAG> = {
  "bull-bear": bullBearWorkflow,
  "quick-scan": quickScanWorkflow,
  "layered": layeredWorkflow,  // ← add this line
};
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/workflows/layered.ts lib/workflows/index.ts
git commit -m "feat(workflows): add four-layer analysis workflow"
```

---

### Task 11: Frontend Chat Client Hook

**Files:**
- Create: `hooks/useChatStream.ts`

**Interfaces:**
- Consumes: SSE stream from Task 7, `ChatMessage` types from Task 1
- Produces: `useChatStream(sessionId)` → `{ messages, status, sendMessage, resumeSession }` — consumed by `ChatPanel` (Task 13)

- [ ] **Step 1: Write the hook**

```ts
// hooks/useChatStream.ts
"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface ChatMessage {
  id: string;
  sessionId: string;
  role: "agent" | "user" | "system";
  senderId: string;
  senderName: string;
  content: string;
  metadata: any;
  timestamp: number;
}

export function useChatStream(sessionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"RUNNING" | "PAUSED" | "STOPPED">("RUNNING");
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    // Load initial history
    fetch(`/api/session/${sessionId}/messages?limit=50`)
      .then(r => r.json())
      .then(data => { if (data.messages) setMessages(data.messages); })
      .catch(() => {});

    // Connect SSE
    const es = new EventSource(`/api/session/${sessionId}/messages/stream`);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener("message", (e) => {
      const msg: ChatMessage = JSON.parse(e.data);
      setMessages(prev => {
        const exists = prev.find(m => m.id === msg.id);
        if (exists) return prev.map(m => m.id === msg.id ? msg : m);
        return [...prev, msg].sort((a, b) => a.timestamp - b.timestamp);
      });
    });

    es.addEventListener("status-change", (e) => {
      const { status: newStatus } = JSON.parse(e.data);
      setStatus(newStatus);
    });

    return () => { es.close(); };
  }, [sessionId]);

  const sendMessage = useCallback(async (content: string, mentionAgentIds?: string[]) => {
    const res = await fetch(`/api/session/${sessionId}/message`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, mentionAgentIds }),
    });
    const data = await res.json();
    if (data.messages) {
      setMessages(prev => {
        const existing = new Set(prev.map(m => m.id));
        const newMsgs = data.messages.filter((m: ChatMessage) => !existing.has(m.id));
        return [...prev, ...newMsgs].sort((a, b) => a.timestamp - b.timestamp);
      });
    }
  }, [sessionId]);

  const resumeSession = useCallback(async () => {
    await sendMessage("@director 继续");
  }, [sendMessage]);

  return { messages, status, connected, sendMessage, resumeSession };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useChatStream.ts
git commit -m "feat(chat): add useChatStream hook"
```

---

### Task 12: Chat UI Components

**Files:**
- Create: `components/chat/ChatPanel.tsx`
- Create: `components/chat/MessageBubble.tsx`
- Create: `components/chat/SystemMessage.tsx`
- Create: `components/chat/ChatInput.tsx`

**Interfaces:**
- Consumes: `useChatStream` hook (Task 11), `ChatMessage` types
- Produces: React components — consumed by `/session/[id]/page.tsx` (Task 14)

- [ ] **Step 1: MessageBubble**

```tsx
// components/chat/MessageBubble.tsx
interface MessageBubbleProps {
  role: "agent" | "user";
  senderName: string;
  content: string;
  metadata?: any;
  timestamp: number;
}

export function MessageBubble({ role, senderName, content, metadata, timestamp }: MessageBubbleProps) {
  const isUser = role === "user";
  const analysis = metadata?.analysis;
  const sentiment = analysis?.sentiment ?? "neutral";
  const sentimentColor = sentiment === "bullish" ? "border-l-emerald-500"
    : sentiment === "bearish" ? "border-l-red-500" : "border-l-zinc-500";

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] bg-emerald-600/20 border border-emerald-700/40 rounded-2xl rounded-br-sm px-4 py-2.5">
          <p className="text-sm text-zinc-200 whitespace-pre-wrap">{content}</p>
          <span className="text-[10px] text-zinc-500 mt-1">
            {new Date(timestamp).toLocaleTimeString("zh-CN")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex mb-4">
      <div className={`max-w-[80%] bg-zinc-900 rounded-xl border-l-4 ${sentimentColor} px-4 py-3`}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-medium text-emerald-400">{senderName}</span>
          {analysis && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              sentiment === "bullish" ? "bg-emerald-900/50 text-emerald-300"
              : sentiment === "bearish" ? "bg-red-900/50 text-red-300"
              : "bg-zinc-800 text-zinc-400"
            }`}>
              {sentiment}
            </span>
          )}
          {analysis?.confidence !== undefined && (
            <span className="text-[10px] text-zinc-500">
              conf: {(analysis.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{content.length > 300 ? content.slice(0, 300) + "…" : content}</p>
        {analysis?.reasoning?.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">▶ reasoning</summary>
            <ul className="mt-1 ml-3 space-y-0.5">
              {analysis.reasoning.map((r: string, i: number) => (
                <li key={i} className="text-xs text-zinc-400">— {r}</li>
              ))}
            </ul>
          </details>
        )}
        <span className="text-[10px] text-zinc-600 mt-1.5 block">
          {new Date(timestamp).toLocaleTimeString("zh-CN")}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: SystemMessage**

```tsx
// components/chat/SystemMessage.tsx
export function SystemMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-center mb-4">
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-full px-4 py-1.5">
        <span className="text-xs text-zinc-500">🎬 {content}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: ChatInput**

```tsx
// components/chat/ChatInput.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import type { AgentInfo } from "./types.js";

interface ChatInputProps {
  agents: AgentInfo[];
  onSend: (content: string, mentionAgentIds?: string[]) => void;
  disabled?: boolean;
}

export function ChatInput({ agents, onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = agents.filter(a =>
    a.name.includes(pickerQuery) || a.id.includes(pickerQuery)
  );

  function handleSend() {
    if (!value.trim()) return;
    onSend(value.trim(), selectedAgents.length > 0 ? selectedAgents : undefined);
    setValue("");
    setSelectedAgents([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "@") {
      e.preventDefault();
      setShowPicker(true);
      setPickerQuery("");
    }
  }

  function toggleAgent(id: string) {
    setSelectedAgents(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  }

  return (
    <div className="border-t border-zinc-800 p-4">
      {selectedAgents.length > 0 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {selectedAgents.map(id => {
            const agent = agents.find(a => a.id === id);
            return (
              <span key={id} className="text-[10px] bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                @{agent?.name ?? id}
                <button onClick={() => toggleAgent(id)} className="hover:text-white">×</button>
              </span>
            );
          })}
        </div>
      )}
      {showPicker && (
        <div className="mb-2 bg-zinc-900 border border-zinc-700 rounded-lg max-h-40 overflow-y-auto">
          <input
            autoFocus
            className="w-full bg-transparent px-3 py-2 text-sm text-zinc-300 outline-none border-b border-zinc-800"
            placeholder="搜索Agent..."
            value={pickerQuery}
            onChange={e => setPickerQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Escape") setShowPicker(false); }}
          />
          {filtered.map(a => (
            <button
              key={a.id}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-800 flex items-center justify-between"
              onClick={() => { toggleAgent(a.id); setShowPicker(false); inputRef.current?.focus(); }}
            >
              <span className="text-zinc-300">{a.name}</span>
              <span className="text-[10px] text-zinc-500">{a.layer ?? a.capabilities[0]}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，输入 @ 选择Agent..."
          disabled={disabled}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-600 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          发送
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: AgentInfo type file**

```ts
// components/chat/types.ts
export interface AgentInfo {
  id: string;
  name: string;
  capabilities: string[];
  layer?: string;
}
```

- [ ] **Step 5: ChatPanel — main container**

```tsx
// components/chat/ChatPanel.tsx
"use client";
import { useRef, useEffect } from "react";
import { useChatStream } from "@/hooks/useChatStream.js";
import { MessageBubble } from "./MessageBubble.js";
import { SystemMessage } from "./SystemMessage.js";
import { ChatInput } from "./ChatInput.js";
import type { AgentInfo } from "./types.js";

interface ChatPanelProps {
  sessionId: string;
  agents: AgentInfo[];
}

export function ChatPanel({ sessionId, agents }: ChatPanelProps) {
  const { messages, status, connected, sendMessage, resumeSession } = useChatStream(sessionId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isPaused = status === "PAUSED";
  const isStopped = status === "STOPPED";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            status === "RUNNING" ? "bg-emerald-400 animate-pulse"
            : status === "PAUSED" ? "bg-amber-400"
            : "bg-zinc-500"
          }`} />
          <span className="text-sm text-zinc-400">
            {status === "RUNNING" ? "分析进行中…"
             : status === "PAUSED" ? "等待你的输入"
             : "分析完成"}
          </span>
        </div>
        {isPaused && (
          <button
            onClick={resumeSession}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
          >
            ▶ 继续分析
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map(msg => {
          if (msg.role === "system") {
            return <SystemMessage key={msg.id} content={msg.content} />;
          }
          return (
            <MessageBubble
              key={msg.id}
              role={msg.role as "agent" | "user"}
              senderName={msg.senderName}
              content={msg.content}
              metadata={msg.metadata}
              timestamp={msg.timestamp}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        agents={agents}
        onSend={sendMessage}
        disabled={isStopped}
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/chat/
git commit -m "feat(chat): add ChatPanel, MessageBubble, SystemMessage, ChatInput components"
```

---

### Task 13: Session Chat Page

**Files:**
- Create: `app/session/[id]/page.tsx`
- Create: `app/session/[id]/client.tsx`

**Interfaces:**
- Consumes: `ChatPanel` from Task 12, `getDb`, `ChatRepo`
- Produces: `/session/:id` page

- [ ] **Step 1: Server page**

```tsx
// app/session/[id]/page.tsx
import { ChatPanelWrapper } from "./client";
import { getDb } from "@/lib/db/client.js";
import { ChatRepo } from "@/lib/db/chat-repo.js";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const repo = new ChatRepo(db);
  const messages = repo.getBySession(id, { limit: 5 });
  const hasMessages = messages.length > 0;

  return (
    <main className="h-screen flex flex-col bg-zinc-950">
      <ChatPanelWrapper sessionId={id} hasMessages={hasMessages} />
    </main>
  );
}
```

- [ ] **Step 2: Client wrapper (fetches agent list)**

```tsx
// app/session/[id]/client.tsx
"use client";
import { useState, useEffect } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel.js";
import type { AgentInfo } from "@/components/chat/types.js";

export function ChatPanelWrapper({ sessionId, hasMessages }: { sessionId: string; hasMessages: boolean }) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);

  useEffect(() => {
    // Fetch agent list from the session or from the workflows API
    fetch("/api/workflows")
      .then(r => r.json())
      .then(data => {
        // Build agent list from available workflows + known agents
        fetch(`/api/session/${sessionId}/messages?limit=1`)
          .then(r => r.json())
          .then(msgData => {
            // Use a hardcoded agent list matching what's registered
            setAgents([
              { id: "market-data", name: "行情数据Agent", capabilities: ["market-data"], layer: "perception" },
              { id: "sentiment-bull", name: "牛方舆情Agent", capabilities: ["sentiment"], layer: "perception" },
              { id: "sentiment-bear", name: "熊方舆情Agent", capabilities: ["sentiment"], layer: "perception" },
              { id: "sentiment-neutral", name: "中性舆情Agent", capabilities: ["sentiment"], layer: "perception" },
              { id: "macro-data", name: "宏观数据Agent", capabilities: ["macro"], layer: "perception" },
              { id: "capital-flow", name: "资金流向Agent", capabilities: ["capital-flow"], layer: "perception" },
              { id: "institutional", name: "机构动向Agent", capabilities: ["institutional"], layer: "perception" },
              { id: "technical-bull", name: "牛方技术分析师", capabilities: ["technical"], layer: "analysis" },
              { id: "technical-bear", name: "熊方技术分析师", capabilities: ["technical"], layer: "analysis" },
              { id: "technical-neutral", name: "中性技术分析师", capabilities: ["technical"], layer: "analysis" },
              { id: "financial-bull", name: "牛方财报分析师", capabilities: ["fundamental"], layer: "analysis" },
              { id: "financial-bear", name: "熊方财报分析师", capabilities: ["fundamental"], layer: "analysis" },
              { id: "financial-neutral", name: "中性财报分析师", capabilities: ["fundamental"], layer: "analysis" },
              { id: "valuation-bull", name: "牛方估值分析师", capabilities: ["valuation"], layer: "analysis" },
              { id: "valuation-bear", name: "熊方估值分析师", capabilities: ["valuation"], layer: "analysis" },
              { id: "valuation-neutral", name: "中性估值分析师", capabilities: ["valuation"], layer: "analysis" },
              { id: "pattern-bull", name: "牛方形态分析师", capabilities: ["pattern"], layer: "analysis" },
              { id: "pattern-bear", name: "熊方形态分析师", capabilities: ["pattern"], layer: "analysis" },
              { id: "event-driven", name: "事件驱动分析师", capabilities: ["event-driven"], layer: "analysis" },
              { id: "volume-bull", name: "牛方量价分析师", capabilities: ["volume"], layer: "analysis" },
              { id: "volume-bear", name: "熊方量价分析师", capabilities: ["volume"], layer: "analysis" },
              { id: "judge", name: "裁判/研判Agent", capabilities: ["judge"], layer: "decision" },
              { id: "portfolio-mgr", name: "组合管理Agent", capabilities: ["portfolio"], layer: "decision" },
              { id: "quant-analyst", name: "量化分析Agent", capabilities: ["quantitative"], layer: "decision" },
              { id: "timing-aggressive", name: "激进择时Agent", capabilities: ["timing"], layer: "decision" },
              { id: "timing-conservative", name: "保守择时Agent", capabilities: ["timing"], layer: "decision" },
              { id: "hedging", name: "对冲策略Agent", capabilities: ["hedging"], layer: "decision" },
              { id: "execution", name: "执行Agent", capabilities: ["execution"], layer: "execution" },
              { id: "risk-ctrl", name: "风控Agent", capabilities: ["risk-control"], layer: "execution" },
              { id: "compliance", name: "合规Agent", capabilities: ["compliance"], layer: "execution" },
              { id: "cost-optimizer", name: "成本优化Agent", capabilities: ["cost-optimization"], layer: "execution" },
            ]);
          });
      });
  }, [sessionId]);

  return <ChatPanel sessionId={sessionId} agents={agents} />;
}
```

Actually, the hardcoded agent list is bad design. Let me instead add an API endpoint that returns the registered agents. But for V1, let me just import the list from the agents module directly (server-side) and pass to client.

Let me improve: the server page passes agents down.

Better approach: Add `GET /api/session` that returns agents. But even simpler: create a shared agent manifest.

Let me just create a simple API endpoint. Actually, the simplest approach for V1:

```ts
// In app/session/[id]/page.tsx — pass agents as a server prop
import { ChatPanel } from "@/components/chat/ChatPanel.js";
import { AGENT_MANIFEST } from "@/lib/agents/manifest.js";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="h-screen flex flex-col bg-zinc-950">
      <ChatPanel sessionId={id} agents={AGENT_MANIFEST} />
    </main>
  );
}
```

Let me create that manifest file in a later task. For now, let me keep the hardcoded list in the client wrapper — it works and we can refactor later.

Actually, let me do it properly — create a small manifest in a later micro-task.

Let me restructure Task 13 to be simpler:

- [ ] **Step 1: Create agent manifest**

```ts
// lib/agents/manifest.ts
import type { AgentInfo } from "@/components/chat/types.js";

export const AGENT_MANIFEST: AgentInfo[] = [
  { id: "market-data", name: "行情数据Agent", capabilities: ["market-data"], layer: "perception" },
  { id: "sentiment-bull", name: "牛方舆情Agent", capabilities: ["sentiment"], layer: "perception" },
  { id: "sentiment-bear", name: "熊方舆情Agent", capabilities: ["sentiment"], layer: "perception" },
  { id: "sentiment-neutral", name: "中性舆情Agent", capabilities: ["sentiment"], layer: "perception" },
  { id: "macro-data", name: "宏观数据Agent", capabilities: ["macro"], layer: "perception" },
  { id: "capital-flow", name: "资金流向Agent", capabilities: ["capital-flow"], layer: "perception" },
  { id: "institutional", name: "机构动向Agent", capabilities: ["institutional"], layer: "perception" },
  { id: "technical-bull", name: "牛方技术分析师", capabilities: ["technical", "bullish"], layer: "analysis" },
  { id: "technical-bear", name: "熊方技术分析师", capabilities: ["technical", "bearish"], layer: "analysis" },
  { id: "technical-neutral", name: "中性技术分析师", capabilities: ["technical", "neutral"], layer: "analysis" },
  { id: "financial-bull", name: "牛方财报分析师", capabilities: ["fundamental", "bullish"], layer: "analysis" },
  { id: "financial-bear", name: "熊方财报分析师", capabilities: ["fundamental", "bearish"], layer: "analysis" },
  { id: "financial-neutral", name: "中性财报分析师", capabilities: ["fundamental", "neutral"], layer: "analysis" },
  { id: "valuation-bull", name: "牛方估值分析师", capabilities: ["valuation", "bullish"], layer: "analysis" },
  { id: "valuation-bear", name: "熊方估值分析师", capabilities: ["valuation", "bearish"], layer: "analysis" },
  { id: "valuation-neutral", name: "中性估值分析师", capabilities: ["valuation", "neutral"], layer: "analysis" },
  { id: "pattern-bull", name: "牛方形态分析师", capabilities: ["pattern", "bullish"], layer: "analysis" },
  { id: "pattern-bear", name: "熊方形态分析师", capabilities: ["pattern", "bearish"], layer: "analysis" },
  { id: "event-driven", name: "事件驱动分析师", capabilities: ["event-driven"], layer: "analysis" },
  { id: "volume-bull", name: "牛方量价分析师", capabilities: ["volume", "bullish"], layer: "analysis" },
  { id: "volume-bear", name: "熊方量价分析师", capabilities: ["volume", "bearish"], layer: "analysis" },
  { id: "judge", name: "裁判/研判Agent", capabilities: ["judge"], layer: "decision" },
  { id: "portfolio-mgr", name: "组合管理Agent", capabilities: ["portfolio"], layer: "decision" },
  { id: "quant-analyst", name: "量化分析Agent", capabilities: ["quantitative"], layer: "decision" },
  { id: "timing-aggressive", name: "激进择时Agent", capabilities: ["timing", "aggressive"], layer: "decision" },
  { id: "timing-conservative", name: "保守择时Agent", capabilities: ["timing", "conservative"], layer: "decision" },
  { id: "hedging", name: "对冲策略Agent", capabilities: ["hedging"], layer: "decision" },
  { id: "execution", name: "执行Agent", capabilities: ["execution"], layer: "execution" },
  { id: "risk-ctrl", name: "风控Agent", capabilities: ["risk-control"], layer: "execution" },
  { id: "compliance", name: "合规Agent", capabilities: ["compliance"], layer: "execution" },
  { id: "cost-optimizer", name: "成本优化Agent", capabilities: ["cost-optimization"], layer: "execution" },
];
```

- [ ] **Step 2: Server page (with manifest)**

```tsx
// app/session/[id]/page.tsx
import { ChatPanel } from "@/components/chat/ChatPanel.js";
import { AGENT_MANIFEST } from "@/lib/agents/manifest.js";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="h-screen flex flex-col bg-zinc-950">
      <ChatPanel sessionId={id} agents={AGENT_MANIFEST} />
    </main>
  );
}
```

- [ ] **Step 3: Update landing page to navigate to `/session/[id]`**

```ts
// In app/page.tsx, change:
// router.push(`/analyze/${sessionId}`);  →  router.push(`/session/${sessionId}`);
```

- [ ] **Step 4: Commit**

```bash
git add app/session/ app/page.tsx lib/agents/manifest.ts components/chat/types.ts
git commit -m "feat(chat): add session chat page with agent manifest"
```

---

### Task 14: Homepage Update — Add Workflow Selection for Layered

**Files:**
- Modify: `app/page.tsx` (update default workflow + navigation target)
- Modify: `components/landing/WorkflowSelector.tsx` (add "layered" option)

**Interfaces:**
- Consumes: existing components
- Produces: updated landing page that can launch layered workflows

- [ ] **Step 1: Update WorkflowSelector**

```tsx
// In components/landing/WorkflowSelector.tsx, add to the options:
const WORKFLOW_OPTIONS = [
  { value: "bull-bear", label: "牛熊对抗" },
  { value: "quick-scan", label: "快速扫描" },
  { value: "layered", label: "四层深度分析" },  // ← add
];
```

- [ ] **Step 2: Update homepage default and API call**

```tsx
// In app/page.tsx
// Change default workflow to "layered"
const [workflow, setWorkflow] = useState("layered");

// Change API endpoint and navigation
const res = await fetch("/api/session", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code: code.trim(), workflow }),
});
const { sessionId } = await res.json();
router.push(`/session/${sessionId}`);
```

- [ ] **Step 3: Verify nothing breaks**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/landing/WorkflowSelector.tsx
git commit -m "feat(ui): update landing page for chat mode + layered workflow"
```

---

### Task 15: WebSocket Status Events

**Files:**
- Modify: `lib/socket/events.ts`
- Modify: `app/api/analyze/route.ts` (existing — if needed)

**Interfaces:**
- Consumes: existing WebSocket events
- Produces: new `SESSION_STATUS` event type

- [ ] **Step 1: Add session status event**

```ts
// In lib/socket/events.ts, add to WS_EVENTS:
SESSION_STATUS: "session:status",  // ← add this line inside the WS_EVENTS object
```

- [ ] **Step 2: Emit status changes from SessionManager**

In `lib/chat/session-manager.ts`, when status changes, we already have SSE events. For backward compat, also emit on WebSocket. Since SessionManager doesn't directly know about Socket.IO, this is optional. Skip WebSocket emit for now — SSE handles it.

- [ ] **Step 3: Commit**

```bash
git add lib/socket/events.ts
git commit -m "feat(chat): add session:status WebSocket event constant"
```

---

### Task 16: Integration Test — Full Chat Flow

**Files:**
- Create: `__tests__/integration/chat-flow.test.ts`

**Interfaces:**
- Consumes: all new API routes, SessionManager, ChatRepo
- Produces: integration test proving the full flow works

- [ ] **Step 1: Write integration test**

```ts
// __tests__/integration/chat-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("chat flow (integration)", () => {
  it("POST /api/session creates a session with agents", async () => {
    const res = await fetch("http://localhost:3000/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "000001", workflow: "quick-scan" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBeDefined();
    expect(body.agents).toBeInstanceOf(Array);
  });

  it("POST /api/session/:id/message sends and returns messages", async () => {
    const createRes = await fetch("http://localhost:3000/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "000001", workflow: "quick-scan" }),
    });
    const { sessionId } = await createRes.json();

    const msgRes = await fetch(`http://localhost:3000/api/session/${sessionId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "hello" }),
    });
    expect(msgRes.status).toBe(200);
    const msgBody = await msgRes.json();
    expect(msgBody.messages).toBeInstanceOf(Array);
    expect(msgBody.messages[0].role).toBe("user");
  });

  it("GET /api/session/:id/messages returns history", async () => {
    const createRes = await fetch("http://localhost:3000/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "000001", workflow: "quick-scan" }),
    });
    const { sessionId } = await createRes.json();

    const histRes = await fetch(`http://localhost:3000/api/session/${sessionId}/messages?limit=10`);
    expect(histRes.status).toBe(200);
    const histBody = await histRes.json();
    expect(histBody.messages).toBeInstanceOf(Array);
  });
});
```

Note: These tests require a running dev server. Mark with `.skip` by default, run with `INTEGRATION=1`.

- [ ] **Step 2: Commit**

```bash
git add __tests__/integration/chat-flow.test.ts
git commit -m "test(chat): add integration tests for chat flow"
```

---

### Task 17: Final Compilation + Test Suite Verification

- [ ] **Step 1: Full type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Run all unit tests**

```bash
npx vitest run
```

- [ ] **Step 3: Fix any failures**

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "chore: final fixes after chat workflow implementation"
```

---

## Implementation Order

```
Task 1  (types)           ──┐
Task 2  (DB store)         ├── Foundation (do first, can parallel)
Task 3  (SSE emitter)     ──┘
Task 4  (layer property)  ── standalone, can do anytime after Task 1
Task 5  (Director)        ── depends on Task 1
Task 6  (SessionManager)  ── depends on Task 2, 5
Task 7  (SSE stream route)── depends on Task 3, 6
Task 8  (session routes)  ── depends on Task 6
Task 9  (message routes)  ── depends on Task 6
Task 10 (layered workflow)── standalone (depends only on builder)
Task 11 (useChatStream)   ── depends on Task 1, 7
Task 12 (ChatUI components)─ depends on Task 1, 11
Task 13 (session page)    ── depends on Task 12
Task 14 (homepage update) ── depends on Task 8, 13
Task 15 (WS events)       ── standalone
Task 16 (integration test)── depends on Task 8, 9, 13
Task 17 (final verify)    ── depends on all
```
