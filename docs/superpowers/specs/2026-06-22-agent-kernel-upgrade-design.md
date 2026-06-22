# Agent Kernel Upgrade — Design Spec

**Date:** 2026-06-22  
**Status:** Draft  
**Scope:** `nextjs-app/lib/engine/`, `nextjs-app/lib/agents/`, `nextjs-app/lib/tools/` (new), `nextjs-app/lib/prompt/` (new)

---

## 1. Problem Statement

All 32 agents share the same structural weaknesses:

| Problem | Current State | Impact |
|---------|--------------|--------|
| **No tool use** | `tools: StructuredTool[] = []` on every agent | Agents cannot fetch or compute data; they fabricate numbers from training data |
| **Shallow prompts** | `"你是一个乐观的分析师"` + JSON format instruction | No domain expertise, no analysis framework, no few-shot guidance |
| **Single-shot LLM calls** | Each agent = one `llm.invoke()` with no iteration | No multi-step reasoning, no ability to gather information iteratively |

The workflow DAG provides structural depth (multi-agent debate, critique, synthesis), but each individual agent is a thin wrapper around a single LLM call.

---

## 2. Design Goals

1. **Give agents real tools.** Tools backed by the existing `DataClient` (kline, financials, indicators, etc.) so agents can retrieve and compute data rather than hallucinate.
2. **Deepen prompt engineering.** Inject genuine financial-domain knowledge and analysis methodology into each agent's system prompt.
3. **Upgrade to ReAct loop.** Replace single-shot `llm.invoke()` with a Thought → Action → Observation loop so agents can reason iteratively and use tools mid-analysis.
4. **Preserve existing architecture.** The ReAct upgrade is internal to each agent invocation. External callers (Scheduler, Director) see no API change.
5. **Migrate incrementally.** Ship the ReAct core + 1 pilot agent first, then roll out to remaining agents in batches.

---

## 3. Architecture

### 3.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Callers (unchanged)                                    │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐    │
│  │ Scheduler │  │ Director │  │ Primitives         │    │
│  │ (legacy)  │  │ (chat)   │  │ (analyze/critique…)│    │
│  └─────┬─────┘  └────┬─────┘  └────────┬───────────┘    │
│        │              │                │                │
│        └──────────────┼────────────────┘                │
│                       ▼                                 │
│  ┌─────────────────────────────────────────┐            │
│  │  runReActLoop(options)  ← NEW           │            │
│  │  • Thought → Action → Observation       │            │
│  │  • Tool execution with error isolation  │            │
│  │  • Max step guard + forced summary      │            │
│  │  • Event emission per step              │            │
│  └──────────────────┬──────────────────────┘            │
│                     │                                   │
│        ┌────────────┼────────────┐                      │
│        ▼            ▼            ▼                      │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ Tool    │ │ Prompt   │ │ LLM      │                 │
│  │ Registry│ │ Builder  │ │ (create  │                 │
│  │ (on     │ │ (compose │ │  LLM)    │                 │
│  │  agent) │ │  system) │ │          │                 │
│  └─────────┘ └──────────┘ └──────────┘                 │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow (single ReAct agent invocation)

```
caller
  │
  ▼
runReActLoop({ agent, context, prompt, tools, maxSteps: 5 })
  │
  ├─► buildSystemPrompt(agent, context) → SystemMessage
  │
  └─► LOOP (step 1..maxSteps):
       │
       ├─► llm.invoke([system, ...history]) with tool schemas
       │
       ├─► if response has tool_calls:
       │     │
       │     ├─► emit "agent:action" event
       │     ├─► execute tool (with timeout + error catch)
       │     ├─► emit "agent:observation" event
       │     └─► append ToolMessage to history → continue loop
       │
       ├─► if response has final_answer:
       │     │
       │     ├─► emit "agent:thought" event
       │     ├─► parse JSON conclusion
       │     └─► return Analysis
       │
       └─► if maxSteps reached:
             │
             ├─► force-request summary with existing observations
             └─► return Analysis (with forcedSummary flag)
```

---

## 4. Component Specifications

### 4.1 `lib/engine/react.ts` — ReAct Loop Core (NEW)

```typescript
interface ReActOptions {
  agent: BaseAgent;
  context: ExecutionContext;
  prompt: string;
  target: AnalysisTarget;
  maxSteps?: number;            // default 5
  toolTimeout?: number;         // default 10_000ms
  llmOptions?: AnalyzeOptions;
  onEvent?: (event: ReActEvent) => void;  // for SSE / Socket.IO emission
  signal?: AbortSignal;
}

type ReActEvent =
  | { type: "thought"; step: number; content: string }
  | { type: "action"; step: number; toolName: string; params: Record<string, unknown> }
  | { type: "observation"; step: number; toolName: string; result: string }
  | { type: "final"; step: number; analysis: Analysis }
  | { type: "forced_summary"; step: number; analysis: Analysis };

async function runReActLoop(options: ReActOptions): Promise<Analysis>
```

**Behavior:**
1. Build system prompt via `buildSystemPrompt(agent, options.context)`.
2. Format tool schemas for LLM function calling from `agent.tools`.
3. Loop: send messages to LLM with tool schemas bound as functions.
4. If LLM returns a tool call: execute tool, append `ToolMessage` with result, continue.
5. If LLM returns final content: parse JSON, emit `final`, return `Analysis`.
6. If loop hits `maxSteps`: force a summary prompt with all observations, return `Analysis` with `forcedSummary: true`.
7. Tool errors are caught, formatted as `{"error": "<message>", "tool": "<toolName>"}`, appended as `ToolMessage`. The LLM can see the failure and try a different approach or proceed without the data.
8. Respect `signal` for cancellation between steps.

**Note:** The current `Analysis` type does not have a `forcedSummary` field. Add `forcedSummary?: boolean` to `Analysis` in `types.ts` (Phase 1, additive, backward-compatible).

### 4.2 `lib/tools/` — Tool Definitions (NEW)

```
lib/tools/
  types.ts          ← ToolDefinition, ToolContext, PropertySchema
  kline.ts          ← get-kline
  indicator.ts      ← calc-ma, calc-macd, calc-rsi
  financial.ts      ← get-financial-summary, get-valuation
  realtime.ts       ← get-realtime-quote
  index.ts          ← barrel
```

#### ToolDefinition interface

```typescript
interface PropertySchema {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  enum?: string[];
  items?: PropertySchema;
  default?: unknown;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, PropertySchema>;
    required: string[];
  };
  execute(params: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}
```

#### ToolContext

```typescript
interface ToolContext {
  dataClient: DataClient;
  target: AnalysisTarget;
  executionState: ExecutionContext;  // read-only snapshot
  signal: AbortSignal;
}
```

#### Example: `calc-macd` tool

```typescript
export const macdTool: ToolDefinition = {
  name: "calc-macd",
  description: "计算指定股票的MACD指标，返回DIF、DEA、柱状值序列",
  parameters: {
    type: "object",
    properties: {
      fast: { type: "number", description: "快线周期", default: 12 },
      slow: { type: "number", description: "慢线周期", default: 26 },
      signal: { type: "number", description: "信号线周期", default: 9 },
    },
    required: [],
  },
  async execute(params, ctx) {
    const fast = (params.fast as number) ?? 12;
    const slow = (params.slow as number) ?? 26;
    const sig = (params.signal as number) ?? 9;
    const res = await ctx.dataClient.kline.indicators({
      symbol: ctx.target.code,
      names: ["MACD"],
      count: 120,
    });
    const macdData = computeMACD(res.data, fast, slow, sig);
    return JSON.stringify(macdData);
  },
};
```

### 4.3 `lib/prompt/` — Prompt Architecture (NEW)

```
lib/prompt/
  builder.ts       ← buildSystemPrompt(agent, context) → string
  technical.ts     ← TechnicalAnalystAgent expertise + methodology
  fundamental.ts   ← FinancialReportAgent expertise + methodology
  judge.ts         ← JudgeAgent methodology
  perception.ts    ← Perception-layer agents
  decision.ts      ← Decision-layer agents
```

#### AgentPrompt structure

```typescript
interface AgentPrompt {
  identity: string;      // role description
  expertise: string;     // domain knowledge
  stance: string;        // bias toward bull/bear/neutral
  methodology: string;   // step-by-step analysis framework
  tools: string;         // auto-generated from agent.tools
  outputFormat: string;  // JSON schema + constraints
}
```

#### Depth tiers

| Tier | Token budget | Includes | Applies to |
|------|-------------|----------|------------|
| **Light** | ~200 | identity + stance + outputFormat | Perception agents (data aggregation, low reasoning need) |
| **Standard** | ~800 | + expertise + methodology | Analysis agents (technical, fundamental, valuation, pattern) |
| **Deep** | ~2000 | + few-shot examples + edge case guidance | Judge, decision-layer core agents |

#### `buildSystemPrompt()` logic

```typescript
function buildSystemPrompt(agent: BaseAgent, context: ExecutionContext): string {
  const prompt = getAgentPrompt(agent.id);  // from prompt/*.ts
  const toolDesc = agent.tools.length > 0
    ? `\n你可以使用以下工具获取数据：\n${agent.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`
    : "";
  return [
    prompt.identity,
    prompt.expertise,
    prompt.stance,
    prompt.methodology,
    toolDesc,
    prompt.outputFormat,
  ].filter(Boolean).join("\n\n");
}
```

### 4.4 `BaseAgent` Interface Changes

In `lib/engine/types.ts`. **This is the TARGET state** — the actual `analyze()` removal and `tools` type change happen in Phase 4, after all agents have been migrated to ReAct.

```typescript
// OLD
interface BaseAgent {
  tools: StructuredTool[];  // ← LangChain dependency, always empty
  analyze(context: ExecutionContext): Promise<Analysis>;  // ← never called
}

// NEW (Phase 4 end-state)
interface BaseAgent {
  tools: ToolDefinition[];                               // ← lightweight, own types
  systemPrompt?: string | ((ctx: ExecutionContext) => string);  // ← optional override
  maxReActSteps?: number;                                // ← default 5
  temperature?: number;                                  // ← default 0.3
  // analyze() removed — agents no longer have their own analyze method;
  // the ReAct loop handles execution generically
}
```

During Phase 1-3, `BaseAgent` keeps `analyze()` and temporarily widens `tools` to `StructuredTool[] | ToolDefinition[]` so both old and new agents coexist. The dummy `analyze()` implementations in agent classes stay until Phase 4 cleanup.

`StructuredTool` import from `@langchain/core/tools` is removed from `types.ts`, `base.ts`, and all agent files in Phase 4. The only LangChain dependencies remaining are `@langchain/core/messages` (for `SystemMessage`/`HumanMessage`/`AIMessage`/`ToolMessage`) and the provider SDKs (`@langchain/openai`/`@langchain/anthropic`).

### 4.5 Primitives Changes

#### `primitives/analyze.ts`

```typescript
// OLD: single llm.invoke()
// NEW: delegates to runReActLoop()

export async function executeAnalyze(
  step: WorkflowStep,
  registry: AgentRegistry,
  context: ExecutionContext,
  options: AnalyzeOptions = {},
): Promise<ExecutionContext> {
  const agent = resolveAgent(step, registry);
  const prompt = (step.prompt ?? "分析 {target}")
    .replace("{target}", context.target.name ?? context.target.code);

  const analysis = await runReActLoop({
    agent,
    context,
    prompt,
    target: context.target,
    maxSteps: agent.maxReActSteps ?? 5,
    llmOptions: options,
    onEvent: (event) => { /* emit Socket.IO event */ },
  });

  return addFinding(context, step.id, agent.id, analysis);
}
```

#### `primitives/panel.ts`

Same pattern — each agent in the panel runs ReAct independently via `Promise.all`.

#### `primitives/critique.ts`, `debate.ts`, `synthesize.ts`, `vote.ts`

These primitives currently use `createLLM()` + `HumanMessage` directly. They should still work, but if the critique/debate agents have tools, they can also benefit from ReAct. The refactor is the same: replace direct `llm.invoke()` with `runReActLoop()`.

### 4.6 Director Changes

`Director.invokeAgent()` in `lib/chat/director.ts` currently does its own prompt assembly and `llm.invoke()`. It should be refactored to delegate to `runReActLoop()`, passing `onEvent` → `onMessage` for SSE streaming.

```typescript
// OLD: direct llm.invoke()
// NEW:
const analysis = await runReActLoop({
  agent: this.registry?.get(agentId),
  context: buildContext(target, findings),
  prompt,
  target,
  llmOptions: this.options,
  onEvent: (event) => {
    if (event.type === "thought") onMessage({ ... });
    if (event.type === "action") onMessage({ ... });
    // etc.
  },
});
```

---

## 5. Migration Plan

### Phase 1: Foundation (no agent changes)
1. Create `lib/engine/react.ts` with `runReActLoop()`.
2. Create `lib/tools/types.ts` with `ToolDefinition`, `ToolContext`.
3. Create `lib/prompt/builder.ts` with `buildSystemPrompt()`.
4. Write unit tests: fake LLM that returns tool_calls then final_answer, verify loop control.
5. At this point: zero behavior change, all 32 agents unchanged, all tests green.

### Phase 2: Pilot (1 agent)
1. Select **TechnicalAnalystAgent** (`technical-bull`) as pilot.
2. Create `lib/tools/kline.ts`, `lib/tools/indicator.ts` — 3 tools (kline fetch, MACD, RSI).
3. Create `lib/prompt/technical.ts` — identity + expertise + methodology at Standard tier.
4. Refactor `primitives/analyze.ts` to call `runReActLoop()` with an `useReAct` flag (default false for all agents except the pilot).
5. Wire pilot through both Scheduler and Director paths.
6. Integration test: full bull-bear workflow with pilot agent using ReAct + real tools.

### Phase 3: Layer Rollout
1. Batch 1: `technical-bear`, `technical-neutral` — reuse same tools + prompt, different stance.
2. Batch 2: Fundamental analysis agents (`financial-bull/bear/neutral`) — add financial tools, Standard-tier prompts.
3. Batch 3: Extended analysis agents (Valuation, Pattern, EventDriven, Volume).
4. Batch 4: Perception layer agents — Light-tier prompts, data-fetching tools.
5. Batch 5: Decision layer agents — Deep-tier prompts, composite-analysis tools.
6. Batch 6: Execution layer — Light-tier, minimal tools.

### Phase 4: Cleanup
1. Remove `useReAct` flag — all agents use ReAct.
2. Remove old `buildSystemPrompt()` logic from `analyze.ts` and `director.ts`.
3. Remove `BaseAgent.analyze()` method — it was never called anyway.
4. Remove `StructuredTool` import from types.

---

## 6. Testing Strategy

| Layer | What | How |
|-------|------|-----|
| **Tool unit tests** | Each tool's `execute()` | Mock `ToolContext`, verify: valid params → correct output, invalid params → error, API error → handled |
| **React loop unit tests** | Loop control logic | Mock LLM (vi.mock `createLLM` to return preset sequences of `AIMessage` with tool_calls then final content); verify: loop iterates N times, tools execute, final parse correct, maxSteps fallback triggers forced summary, error recovery via error ToolMessage
| **Prompt snapshot tests** | `buildSystemPrompt()` output | Per agent: snapshot the composed prompt, flag unexpected changes |
| **Primitive integration** | `executeAnalyze` with ReAct | Reuse existing fake LLM pattern; verify `ExecutionContext` is properly updated with findings |
| **Director integration** | `Director.advance()` with ReAct agent | Mock `DataClient`; verify SSE events emitted in correct order |
| **API end-to-end** | POST /api/session → SSE stream | Extend existing `chat-flow.test.ts` to verify ReAct events appear in stream |

---

## 7. File Change Summary

```
NEW:
  nextjs-app/lib/engine/react.ts              ReAct loop core
  nextjs-app/lib/engine/__tests__/react.test.ts
  nextjs-app/lib/tools/types.ts               ToolDefinition, ToolContext
  nextjs-app/lib/tools/kline.ts               K-line data tool
  nextjs-app/lib/tools/indicator.ts           MACD, RSI, MA tools
  nextjs-app/lib/tools/index.ts               barrel
  nextjs-app/lib/prompt/builder.ts            buildSystemPrompt()
  nextjs-app/lib/prompt/technical.ts          Technical agent prompts

MODIFIED:
  nextjs-app/lib/engine/types.ts              BaseAgent interface (tools type, remove analyze())
  nextjs-app/lib/engine/primitives/analyze.ts  integrate runReActLoop()
  nextjs-app/lib/engine/primitives/panel.ts    integrate runReActLoop()
  nextjs-app/lib/chat/director.ts             integrate runReActLoop()
  nextjs-app/lib/agents/technical.ts          add tools + prompt config
  nextjs-app/lib/agents/base.ts               remove analyze() abstract method
  nextjs-app/lib/agents/*.ts                  (phased) add tools + prompts
  nextjs-app/lib/agents/index.ts              registerAgent calls may change

NOT MODIFIED (Phase 1-2):
  nextjs-app/lib/engine/scheduler.ts          unchanged — calls primitives
  nextjs-app/lib/engine/context.ts            unchanged — immutable context still works
  nextjs-app/lib/engine/registry.ts           unchanged — agent registry
  nextjs-app/lib/engine/builder.ts            unchanged — workflow DSL
  nextjs-app/lib/workflows/*.ts               unchanged — workflow definitions
```

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| ReAct loop increases latency (5 LLM calls vs 1) | `maxReActSteps` capped at 5; agents without tools exit in 1 step (final answer immediately). Streaming events keep UI responsive. |
| Tool execution fails silently | Errors formatted as observation text; LLM can retry or work around. Timeout per tool prevents hangs. |
| Prompt bloat from deep methodology | Tiered depth — only decision-layer agents get full ~2000 tokens. Perception agents stay at ~200. |
| Breaking change to BaseAgent interface | Phase 1 is purely additive. Phase 2 removes unused `analyze()` — verified it's never called. |
| Two execution paths diverge | Both Scheduler and Director call `runReActLoop()`, keeping behavior in one place. |

---

## 9. Success Criteria

1. A `technical-bull` agent, given a stock code, can independently: fetch K-line data → compute MACD → analyze → produce a conclusion with data-backed reasoning.
2. The ReAct loop's `thought/action/observation` events stream to the chat UI in real time.
3. All existing tests pass throughout migration (Phase 1-4).
4. No regression in end-to-end latency for agents that don't use tools (they exit ReAct in 1 step).
