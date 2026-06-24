# AGENTS.md — AI Assistant Guidelines for AgentTrade

## Project Overview

AgentTrade is a Next.js full-stack application implementing a multi-agent adversarial market analysis framework. The engine is open source (AGPL-3.0).

Agents and workflows are defined as YAML files, compiled at runtime into LangChain/LangGraph execution graphs. Users can upload custom agent/workflow YAMLs via the web UI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web framework | Next.js 15 (App Router), React 18 |
| UI | shadcn/ui + Tailwind CSS 4 |
| Language | TypeScript 5.x, strict mode |
| LLM abstraction | LangChain.js (`@langchain/core`, `@langchain/openai`, `@langchain/anthropic`) |
| DAG orchestration | `@langchain/langgraph` (StateGraph, conditional edges, debate subgraphs) |
| Agent framework | LangChain `createToolCallingAgent` + `AgentExecutor` for tool-using agents |
| Role definition | YAML files (built-in `roles/` + DB `user_roles` for user uploads) |
| Output parsing | LangChain `StructuredOutputParser` with Zod schemas |
| Prompt templating | LangChain `ChatPromptTemplate` (Jinja2-style `{{variable}}` → `{variable}`) |
| Real-time | Socket.IO (namespace `/analysis`) |
| Database | SQLite (better-sqlite3) |
| Testing | Vitest + @testing-library/react (jsdom) |
| Data service | Python 3.11+ FastAPI + akshare (separate repo: `d2-data`) |

## Project Structure

```
├── app/                          Next.js App Router
│   ├── layout.tsx                Root layout (zh-CN, dark theme)
│   ├── page.tsx                  Landing page (stock search + workflow selector)
│   ├── analyze/[id]/
│   │   ├── page.tsx              SSR analysis page (reads SQLite)
│   │   └── client.tsx            Client hydration (WebSocket live updates)
│   ├── roles/page.tsx            Role management (agent/workflow upload)
│   └── api/
│       ├── analyze/route.ts      POST — start analysis (uses LangGraph runner)
│       ├── analyze/[id]/route.ts GET — analysis result
│       ├── roles/route.ts        GET/POST — list/upload user roles
│       ├── roles/[id]/route.ts   DELETE — delete user role
│       └── workflows/route.ts    GET — list YAML workflows
├── components/
│   ├── ui/                       shadcn/ui primitives (Button, Card, Input)
│   ├── landing/                  StockSearchInput, WorkflowSelector
│   └── analysis/                 AnalysisHeader, StepProgress, LiveDebatePanel,
│                                  AgentBubble, ConclusionCard
├── hooks/
│   └── useAnalysisSocket.ts      Socket.IO client hook
├── lib/
│   ├── role-loader/              YAML → LangChain compilation
│   │   ├── schema.ts             Zod schemas (AgentYaml, WorkflowYaml)
│   │   ├── loader.ts             RoleLoader — parse, compile, pool
│   │   └── repo.ts               RoleRepo — user_roles DB CRUD
│   ├── langgraph/                LangGraph engine
│   │   ├── state.ts              WorkflowState Annotation
│   │   ├── nodes.ts              agentNode, checkYieldNode
│   │   ├── builder.ts            WorkflowYaml → StateGraph
│   │   ├── debate.ts             Debate subgraph (loop + yield check)
│   │   ├── compiler.ts           Top-level compiler
│   │   └── runner.ts             runWorkflow() entry point
│   ├── tools/                    Tool registry
│   │   ├── types.ts              ToolDefinition interface
│   │   ├── index.ts              toolsByName Map + kline/macd/rsi/ma
│   │   ├── kline.ts              K-line data tool
│   │   └── indicator.ts          Technical indicator tool
│   ├── llm/                      LLM abstraction
│   │   └── create-llm.ts         Provider factory (deepseek/openai/anthropic)
│   ├── chat/                     Chat session management
│   │   ├── types.ts              Session types
│   │   ├── sse-emitter.ts        SSE streaming emitter
│   │   └── session-manager.ts    Session CRUD (no Director)
│   ├── socket/                   Socket.IO server
│   │   ├── server.ts             createSocketServer, singleton
│   │   └── events.ts             Event constants + payload types
│   ├── engine/                   Core types + registry (legacy, minimal)
│   │   ├── types.ts              Core type definitions
│   │   ├── registry.ts           AgentRegistry (kept for backward compat)
│   │   └── index.ts              Barrel export
│   ├── data/                     Python data service HTTP client
│   │   ├── client.ts             DataClient
│   │   └── types.ts              Response types
│   ├── auth/                     Auth adapter hook layer (open-source side)
│   │   ├── types.ts              AuthAdapter interface, NoopAuthAdapter
│   │   └── __tests__/
│   └── db/                       SQLite persistence
│       ├── client.ts             getDb (singleton, WAL mode)
│       ├── analysis-repo.ts      AnalysisRepo (CRUD)
│       └── migrations/           DB migrations (001…, 002-user-roles)
├── server.mjs                    Custom Next.js server (loads Socket.IO)
├── middleware.ts                  Auth middleware — injects x-user-id/x-user-role
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
└── vitest.setup.ts

roles/                            YAML role definitions (at repo root)
├── agents/                       20 built-in agent YAMLs
│   ├── tech-analyst.yaml
│   ├── judge.yaml
│   ├── financial-analyst.yaml
│   └── ... (17 more)
└── workflows/                    4 built-in workflow YAMLs
    ├── bull-bear.yaml
    ├── bull-bear-debate.yaml
    ├── quick-scan.yaml
    └── layered.yaml
```

## Coding Conventions

### TypeScript

- **Module system:** ESM (`"type": "module"`, `.js` extensions in imports)
- **Strict mode:** `strict: true` — no `any` in production code
- **Immutability:** Context operations (`addFinding`, `addDebateRound`) return new objects
- **Types:** All public APIs must have explicit return types
- **Tests:** `__tests__/` directory co-located or per module, vitest, one test file per source module
- **LLM:** Never call Anthropic/OpenAI SDKs directly — always through `createLLM()` in `lib/llm/create-llm.ts`
- **Path alias:** `@/*` maps to `./*` for imports (tsconfig baseUrl: ".")

### React / Next.js

- **Server/Client split:** Page components are server components by default; interactive components use `"use client"` directive
- **SSR strategy:** Analysis page renders existing data server-side; `AnalysisLiveClient` hydrates for WebSocket updates
- **Components:** Use shadcn/ui patterns (`cva`, `forwardRef`, `cn()` utility)

### Socket.IO

- **Event contract:** Use `WS_EVENTS` constants from `lib/socket/events.ts`
- **Namespace:** `/analysis` for all real-time analysis events
- **Rooms:** Each analysis session gets its own Socket.IO room (`sessionId`)
- **Client:** Import `useAnalysisSocket` hook from `hooks/useAnalysisSocket.ts`

## Key Patterns

### Defining an Agent (YAML)

```yaml
# roles/agents/my-agent.yaml
id: my-agent
name: 我的分析师
system_prompt: |
  你是一位专业的A股分析师。分析目标：{{target}}。

  ## 分析框架
  1. 第一步
  2. 第二步
  3. 综合研判

tools:
  - kline
  - macd

output_schema:
  conclusion: { type: string, description: "分析结论" }
  confidence: { type: number, min: 0, max: 1 }
  sentiment: { type: string, enum: [bullish, bearish, neutral] }
  reasoning: { type: array, items: string }

model:
  provider: deepseek
  model: deepseek-chat
  temperature: 0.7

max_tool_steps: 5
```

Agents are neutral — no built-in stance or layer. The workflow prompt assigns the role.

### Defining a Workflow (YAML)

```yaml
# roles/workflows/my-wf.yaml
name: my-workflow
description: 自定义分析流程

nodes:
  - id: step1
    agent: tech-analyst
    prompt: |
      从技术面分析 {{target}}，给出3条核心理由。

  - id: step2
    agent: judge
    depends_on: [step1]
    prompt: |
      基于技术分析结果，对 {{target}} 做出研判。

      技术面：{{state.step1}}

  # Parallel nodes (no depends_on = run in parallel)
  # Debate nodes — see roles/workflows/bull-bear-debate.yaml
```

Key rules:
- Agent IDs reference built-in or user-uploaded agents
- `depends_on` defines DAG edges — nodes without it run in parallel from START
- Nodes not depended on by others → connect to END
- `{{target}}` resolves to the stock code at runtime
- `{{state.<node_id>}}` and `{{state.<node_id>.<field>}}` resolve to prior node outputs

### Adding a New Tool

1. Create `lib/tools/<name>.ts` implementing `ToolDefinition` interface
2. Register in `lib/tools/index.ts` → `toolsByName.set("name", newTool)`
3. Reference `name` in agent YAML `tools:` list

### Adding an API Route

1. Create `app/api/<path>/route.ts`
2. Export `GET`/`POST`/etc. as named exports
3. Use `NextRequest`/`NextResponse` from `next/server`
4. Import engine/services via `@/lib/...` path alias

## Testing

```bash
# All tests
pnpm test

# Single file
pnpm vitest run lib/langgraph/__tests__/nodes.test.ts
pnpm vitest run lib/role-loader/__tests__/loader.test.ts

# Watch mode
pnpm vitest

# Integration tests (requires data service + API keys)
pnpm vitest run __tests__/integration/

# Type check
pnpm lint
```

Use `FakeToolCallingChatModel` from `lib/llm/__tests__/test-utils.ts` for tests that need LLM output without real API calls.

## Auth Adapter (SaaS Hook Layer)

This project uses an Open-Core pattern: the open-source repo defines interfaces only; a private `agenttrade-saas` repo injects real auth through `setAuthAdapter()`.

### Architecture

```
Open source (agenttrade)              Private SaaS (agenttrade-saas)
┌──────────────────────────┐         ┌──────────────────────────────┐
│ AuthAdapter interface      │         │ RealAuthAdapter implements    │
│ NoopAuthAdapter (default)  │  ←set   │ NextAuth.js + OAuth + DB     │
│ middleware (x-user-id)     │         │ users.db (separate file)     │
│ DB: user_id DEFAULT 'anon' │         │ app/login/ app/admin/        │
└──────────────────────────┘         └──────────────────────────────┘
```

### Key Interfaces

```typescript
// lib/auth/types.ts — open-source side
interface AuthAdapter {
  getSession(request: Request): Promise<Session | null>;
  hasPermission(user: User, permission: string): boolean;
  getQuotaLimit(user: User): Promise<number>;   // -1 = unlimited
  getQuotaUsed(user: User): Promise<number>;
}

// Default: everyone is anonymous, unlimited access
class NoopAuthAdapter implements AuthAdapter { ... }

// Private SaaS repo calls this at startup:
setAuthAdapter(new RealAuthAdapter());
```

### Data Flow

1. Request arrives → `middleware.ts` calls `getAuthAdapter().getSession(request)`
2. Session valid → injects `x-user-id` / `x-user-role` into request headers
3. Session null → returns 401 (only in private SaaS; NoopAuthAdapter always returns anonymous)
4. API routes read `const userId = req.headers.get("x-user-id") ?? "anonymous"`
5. DB queries filter by `userId` (anonymous sees all, authenticated sees own)

### DB: Two Independent SQLite Files

```
agenttrade.db (open source)          users.db (private SaaS)
├── analyses (+user_id)             ├── users
├── sessions (+user_id)             ├── subscriptions
└── chat_messages                   ├── quotas
                                    └── oauth_accounts

Linked by user_id string (app-level, not FK).
```

### Safety

- `x-user-id` is server-set by middleware — clients CANNOT forge it
- `NoopAuthAdapter` always returns anonymous → open-source app works without any user system
- No real auth logic, password hashing, OAuth secrets, or billing code in open-source repo

## Common Pitfalls

- Agent YAML `id` must be unique across built-in and user roles — user uploads conflicting with built-in IDs get 409
- Workflow `depends_on` references must be valid node IDs — validated by Zod at load time
- `{{variable}}` uses Jinja2 double-brace syntax; the loader converts to LangChain single-brace `{variable}`
- Workflow execution uses LangGraph `StateGraph` — state flows through nodes via `WorkflowState` Annotation
- Tool-using agents go through `createToolCallingAgent` + `AgentExecutor`; non-tool agents use direct `llm.invoke()`
- User-uploaded roles are stored in `user_roles` table and loaded per-request via `loadFromDB(userId)`
- Previous user's DB-loaded roles are cleared when a new user makes a request (cross-user isolation)
- Python data service must be running separately (`python main.py` on `:9500`)
- `DataClient` default URL is `localhost:9500` — override via `dataServiceUrl` in API request
- `useAnalysisSocket` must be called inside `useEffect` or client component (uses `window.location`)
- `server.mjs` inlines Socket.IO init — keep in sync with `lib/socket/server.ts`
- `x-user-id` header is set by `middleware.ts` — API routes should read it, never set it
- New DB tables must include `user_id TEXT NOT NULL DEFAULT 'anonymous'` for multi-tenant support
- `runMigrations()` uses broad try/catch for ALTER TABLE idempotency — check error.message if adding new migrations

## API Key Setup

Copy `.env.example` to `.env` and fill in keys:
- `deepseek` — `OPENAI_API_KEY`, baseURL `https://api.deepseek.com/v1`
- `openai` — `OPENAI_API_KEY`
- `anthropic` — `ANTHROPIC_API_KEY`

## Subagent Model Tiering

When dispatching sub-agents (via `Agent` tool or Workflow `agent()`), select the model based on task complexity:

| Tier | Model | When to Use |
|------|-------|-------------|
| **T0 — Trivial** | `haiku` | File search (Explore agent), grep/pattern matching, reading known paths, simple lookups, finding config values. Tasks where you just need to locate something. |
| **T1 — Routine** | `sonnet` | General feature implementation, refactoring, writing tests, fixing straightforward bugs, adding components, updating API routes. The default for most implementation work. |
| **T2 — Review** | `opus` | Code review (`/code-review`), security audit, architectural decisions, complex debugging, designing new primitives or workflow definitions, LLM prompt engineering. |
| **T3 — Critical** | `fable` | Adversarial verification of findings, mission-critical design decisions, complex multi-step reasoning chains, judging the correctness of other agents' output. Use sparingly — only when you cannot afford a mistake. |

### Workflow script convention

```js
// Trivial search phase
agent("find all workflow files", { model: "haiku", phase: "Scan" })

// Implementation phase (default — omit model to inherit)
agent("implement the new primitive", { phase: "Implement" })

// Critical review phase
agent("adversarially verify the fix", { model: "fable", phase: "Verify" })
```

### Default rule

When in doubt, **omit `model`** — the subagent inherits the session model, which is correct for most tasks. Only set it explicitly when the task is clearly cheaper (Haiku) or more demanding (Opus/Fable) than average.
