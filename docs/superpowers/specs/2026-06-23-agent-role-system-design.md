# AgentTrade — 动态角色系统 + LangChain/LangGraph 重构设计

**Date:** 2026-06-23
**Status:** 设计确认

## 目标

1. Agent 提示词系统完善：所有 agent 拥有丰富的 identity/expertise/methodology prompt
2. 角色动态注入：Agent + Workflow 全由 YAML 定义，不再硬编码
3. 用户上传角色：通过管理页面提交 YAML，存入 DB 并与用户绑定
4. 利用 LangChain/LangGraph 标准能力替代自建引擎（prompt template、output parser、tool-calling agent、DAG 调度）

## 设计原则

- **Agent 中性化**：去掉 capabilities、layer、personality — 所有 agent 默认中性，立场完全由 workflow 注入的 prompt 决定
- **Workflow 直接引用 agent**：通过 agent ID 精确引用，不再需要标签匹配
- **YAML 是唯一的定义源**：文件系统 = 内置角色，数据库 = 用户上传角色，编译后统一进池

---

## YAML Schema

### Agent 定义

文件位置：
- 内置：`roles/agents/<id>.yaml`
- 用户上传：存入 DB `user_roles` 表

```yaml
# roles/agents/tech-analyst.yaml
id: tech-analyst
name: 技术面分析师
system_prompt: |
  你是一位资深的技术面分析师，拥有15年A股实战经验。
  从K线图、技术指标、量价关系中发掘交易机会。

  ## 分析框架
  1. 判断大趋势方向（日线/周线级别）
  2. 识别中期技术信号（K线形态、MACD、均线）
  3. 量价配合验证
  4. 关键支撑阻力位分析
  5. 综合研判

tools:
  - kline
  - macd
  - rsi
  - ma

output_schema:
  conclusion:
    type: string
    description: "分析结论"
  confidence:
    type: number
    min: 0
    max: 1
  sentiment:
    type: string
    enum: [bullish, bearish, neutral]
  reasoning:
    type: array
    items: string

model:
  provider: deepseek
  model: deepseek-chat
  temperature: 0.7

max_tool_steps: 5
```

**字段说明：**

| 字段 | 必填 | 说明 |
|------|:----:|------|
| `id` | ✓ | 唯一标识，workflow 中通过此 ID 引用 |
| `name` | ✓ | 显示名称 |
| `system_prompt` | ✓ | 系统提示词，支持 `{{target}}`、`{{findings}}`、`{{task}}` 变量 |
| `tools` | | 工具名称列表，对应 `lib/tools/` 中注册的工具 |
| `output_schema` | | Zod-like schema，编译为 `StructuredOutputParser`；不填则自由文本 |
| `model` | | LLM 配置；不填则用全局默认 |
| `max_tool_steps` | | ReAct 最大步数，默认 5 |

### Workflow 定义

文件位置：
- 内置：`roles/workflows/<name>.yaml`
- 用户上传：存入 DB `user_workflows` 表

#### 普通线性/并行 Workflow

```yaml
# roles/workflows/bull-bear.yaml
name: bull-bear
description: 标准牛熊对抗分析
version: "1.0"

nodes:
  - id: bull_init
    agent: tech-analyst
    prompt: |
      从技术面看多 {{target}}。
      关注均线多头排列、MACD金叉、放量突破等做多信号。
      给出3条核心理由。

  - id: bear_init
    agent: tech-analyst
    prompt: |
      从技术面看空 {{target}}。
      关注死叉、破位、顶背离、缩量等做空信号。
      给出3条核心理由。

  - id: judge
    agent: judge
    depends_on: [bull_init, bear_init]
    prompt: |
      综合双方分析，对 {{target}} 做出最终研判。

      牛方：{{state.bull_init}}
      熊方：{{state.bear_init}}

      给出操作建议和关键价位。
```

#### 辩论型 Workflow

```yaml
# roles/workflows/bull-bear-debate.yaml
name: bull-bear-debate
description: 牛熊自由辩论，直到一方认输或达到轮次上限
version: "1.0"

nodes:
  - id: bull_init
    agent: tech-analyst
    prompt: |
      从技术面看多 {{target}}，列出你的核心论据。

  - id: bear_init
    agent: tech-analyst
    prompt: |
      从技术面看空 {{target}}，列出你的核心论据。

  - id: debate
    type: debate
    depends_on: [bull_init, bear_init]
    participants:
      - agent: tech-analyst
        role: bull
        first: true
      - agent: tech-analyst
        role: bear
    max_rounds: 10
    stop_when:
      field: yield
      condition: any              # any = 任一方认输即停
    prompt_template: |
      你是{{role}}方。当前是第{{round}}轮辩论。

      对方上一轮的观点：{{opponent.last_argument}}

      请针对对方论点进行反驳或补充，然后给出你更新后的判断。
      如果你认为对方论点更有说服力，可以认输（yield: true）。

  - id: judge
    agent: judge
    depends_on: [debate]
    prompt: |
      辩论已结束。

      结束原因：{{debate.stop_reason}}（共{{debate.total_rounds}}轮）

      牛方全部论点：
      {{debate.bull.arguments}}

      熊方全部论点：
      {{debate.bear.arguments}}

      请做出最终研判，评估双方论据强度并给出操作建议。
```

**debate 参与者的 output_schema：**

```yaml
# 辩论 agent 比普通 agent 多一个 yield 字段
output_schema:
  argument: { type: string, description: "本轮论点" }
  counter_to: { type: string, description: "针对对方哪个论点进行反驳" }
  confidence: { type: number, min: 0, max: 1 }
  yield: { type: boolean, description: "是否认输，true=接受对方观点" }
```

**辩论执行逻辑（LangGraph subgraph）：**

```
debate_subgraph:
  ┌──────────┐     ┌──────────┐     ┌───────────────┐
  │ BULL_SPK │────▶│ BEAR_SPK │────▶│ CHECK_YIELD   │
  │ (LLM)    │     │ (LLM)    │     │ (纯函数,无LLM) │
  └──────────┘     └──────────┘     └──┬────────┬───┘
        ▲                              │        │
        │          continue            │      done
        └──────────────────────────────┘        │
                                                ▼
                                          ┌──────────┐
                                          │  JUDGE   │
                                          │  (LLM)   │
                                          └──────────┘
```

- `CHECK_YIELD` 是纯逻辑节点：读上一轮两个参与者的 `yield` 字段
- `stop_when.condition: any` → 任一方 `yield == true` 就 exit
- `max_rounds` 到达时强制 exit，交给 judge 裁决
- 发言顺序交替：奇数轮 Bull 先说，偶数轮 Bear 先说

### 变量体系

| 变量 | 可用范围 | 说明 |
|------|----------|------|
| `{{target}}` | 所有 prompt | 分析目标，由 API 请求注入 |
| `{{task}}` | 所有 prompt | 当前节点的任务描述 |
| `{{state.<node_id>}}` | 有 depends_on 的节点 | 引用前置节点的完整输出 |
| `{{state.<node_id>.<field>}}` | 同上 | 引用前置节点输出的特定字段 |
| `{{findings}}` | 有 depends_on 的节点 | 所有前置节点的格式化列表 |
| `{{round}}` | debate 内部 | 当前辩论轮次 |
| `{{role}}` | debate 内部 | 当前发言角色（bull/bear） |
| `{{opponent.last_argument}}` | debate 内部 | 对手上一轮论点 |
| `{{debate.stop_reason}}` | debate 后的节点 | `"yield"` 或 `"max_rounds"` |
| `{{debate.total_rounds}}` | debate 后的节点 | 实际辩论轮数 |
| `{{debate.<role>.arguments}}` | debate 后的节点 | 某角色的全部辩论记录 |

---

## 架构

### 改造前后

**改造前：**
```
AgentClass ×15 ──▶ AgentRegistry ──▶ Director ──▶ runReActLoop ──▶ LLM
Prompt 拼接 ×3 路径                         自写 DAG 调度
Output parse (手写)
```

**改造后：**
```
内置 YAML ──┐
            ├──▶ RoleLoader ──▶ ChatPromptTemplate ──▶ LangGraph StateGraph ──▶ LLM
用户上传 YAML ┘                  StructuredOutputParser      (含 debate subgraph)
(DB 绑定)                         createToolCallingAgent     Streaming events
```

### 文件变更清单

| 操作 | 文件 | 原因 |
|------|------|------|
| **新增** | `lib/role-loader/loader.ts` | YAML 解析 + 编译为 LangChain 对象 |
| **新增** | `lib/role-loader/schema.ts` | Zod schema 校验 YAML 结构 |
| **新增** | `lib/role-loader/repo.ts` | DB CRUD（用户角色存储） |
| **新增** | `lib/langgraph/builder.ts` | YAML workflow → StateGraph 编译器 |
| **新增** | `lib/langgraph/nodes.ts` | 通用 agent node、debate node、judge node |
| **新增** | `lib/langgraph/debate.ts` | debate subgraph 构建 |
| **新增** | `roles/agents/` | 内置 agent YAML |
| **新增** | `roles/workflows/` | 内置 workflow YAML |
| **新增** | `app/api/roles/` | 用户上传/管理角色 API |
| **删除** | `lib/agents/` (8 文件) | 由 YAML 定义替代 |
| **删除** | `lib/engine/primitives/` (6 文件) | 由 LangGraph nodes 替代 |
| **删除** | `lib/engine/scheduler.ts` | 由 LangGraph 替代 |
| **删除** | `lib/engine/builder.ts` | 由 `langgraph/builder.ts` 替代 |
| **删除** | `lib/engine/context.ts` | 由 LangGraph State 替代 |
| **删除** | `lib/engine/react.ts` | 由 `createToolCallingAgent` 替代 |
| **删除** | `lib/chat/director.ts` | 由 LangGraph 执行替代 |
| **删除** | `lib/prompt/` (2 文件) | 由 `ChatPromptTemplate` 替代 |
| **删除** | `lib/llm/parse.ts` | 由 `StructuredOutputParser` 替代 |
| **保留重构** | `lib/tools/` | 保留，适配 LangChain StructuredTool 接口 |
| **保留重构** | `lib/llm/create-llm.ts` | 简化为纯 model factory |
| **保留重构** | `lib/chat/session-manager.ts` | 重构为 LangGraph checkpointer 封装 |
| **保留重构** | `lib/socket/` | 保留，适配 LangGraph streaming events |
| **保留重构** | `lib/engine/types.ts` | 精简为核心类型（ExecutionContext 等） |

### 新增依赖

```json
{
  "@langchain/langgraph": "^0.2.0",
  "js-yaml": "^4.1.0"
}
```

### 核心流程

```
1. 启动阶段
   RoleLoader.scan("roles/") → 解析内置 YAML
   RoleLoader.loadFromDB(userId) → 解析用户上传 YAML
   → 编译 Agent: YAML → ChatPromptTemplate + StructuredOutputParser + createToolCallingAgent
   → 编译 Workflow: YAML → StateGraph(含 debate subgraph)
   → 存入 AgentPool / WorkflowPool (内存缓存)

2. 分析请求
   POST /api/analyze { code, workflow_name }
   → 从 WorkflowPool 取出 StateGraph
   → 注入 {{target}} = code
   → graph.stream({ target, task }) → LangGraph streaming events

3. Streaming 桥接
   LangGraph .stream() → { node, type, content }[]
   → 转换为 WS_EVENTS (Socket.IO) 或 SSE
   → 前端渲染 AgentBubble / StepProgress
```

---

## DB Schema

### 用户角色表

```sql
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('agent', 'workflow')),
  name TEXT NOT NULL,
  yaml_content TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE UNIQUE INDEX idx_user_roles_unique ON user_roles(user_id, type, id);
```

---

## API

### POST /api/roles/upload

用户上传 YAML 角色。

```
Request: multipart/form-data
  - file: .yaml 文件
  - type: "agent" | "workflow"

Response 200:
  { "id": "my-agent", "type": "agent", "name": "我的自定义分析师" }

Error 422:
  { "error": "YAML schema validation failed", "details": [...] }
```

### GET /api/roles

列出当前用户的角色。

```
Response 200:
{
  "agents": [{ "id", "name", "builtin": false, "createdAt" }],
  "workflows": [{ "id", "name", "builtin": false, "createdAt" }]
}
```

### DELETE /api/roles/:id

删除用户上传的角色。

```
Response 200: { "deleted": true }
Error 404: { "error": "Role not found" }
```

---

## 前端页面

### 角色管理页 (`app/roles/page.tsx`)

```
┌─────────────────────────────────────────────┐
│  角色管理                                    │
│                                             │
│  ┌─ Agent ───┬─ Workflow ─────────────────┐ │
│  │ 内置 (12)   │ 内置 (3)                    │ │
│  │ · tech-..  │ · bull-bear                 │ │
│  │ · judge    │ · bull-bear-debate          │ │
│  │ · funda..  │ · quick-scan                │ │
│  │            │                             │ │
│  │ 我的 (2)    │ 我的 (1)                    │ │
│  │ · my-agent │ · my-workflow               │ │
│  │            │                             │ │
│  └────────────┴─────────────────────────────┘ │
│                                             │
│  [+ 上传新角色]  拖拽或选择 .yaml 文件         │
└─────────────────────────────────────────────┘
```

---

## 迁移策略

### Phase 1: 基础设施搭建
1. 安装新依赖 (`@langchain/langgraph`, `js-yaml`)
2. 创建 `lib/role-loader/`：YAML 解析 + Zod 校验
3. 创建 DB migration：`user_roles` 表
4. 创建 `lib/langgraph/`：builder + nodes

### Phase 2: 内置角色迁移
1. 将现有 agent 改写为 YAML（逐个迁移，保留原 Class 兜底）
2. 将现有 workflow 改写为 YAML
3. LangGraph 执行路径与旧引擎并行运行（通过 flag 切换）

### Phase 3: 切换
1. 默认启用 LangGraph 路径
2. 删除旧代码（`lib/agents/`, `lib/engine/` 等）
3. 前端适配新的 streaming event 格式

### Phase 4: 用户上传
1. 实现 `app/api/roles/` API
2. 实现 `app/roles/` 管理页面
3. RoleLoader 合并内置 + DB 来源

---

## 变量语法

YAML 中使用 `{{variable}}`（Jinja2 风格），编译时转译为 LangChain 的 `{variable}` 语法。
理由：`{{ }}` 在 YAML 字符串中无歧义，且用户更熟悉 Jinja2 风格。

## 模型映射

`agent.model.provider` 到 LangChain ChatModel 的映射（复用 `lib/llm/create-llm.ts`）：

| provider | LangChain Class | env 配置 |
|----------|----------------|----------|
| `deepseek` | `ChatOpenAI` | `OPENAI_API_KEY` + `baseURL: https://api.deepseek.com/v1` |
| `openai` | `ChatOpenAI` | `OPENAI_API_KEY` |
| `anthropic` | `ChatAnthropic` | `ANTHROPIC_API_KEY` |

不填 `model` 时使用全局默认配置。

## debate output_schema

Debate 节点自动在 agent 的 `output_schema` 基础上附加 `yield` 和 `counter_to` 字段。
用户不需要在 agent YAML 中预定义辩论专用字段 — 引擎编译时自动 merge。

## 错误处理

- YAML 校验失败 → 启动时报错，拒绝加载该角色（不影响其他角色）
- LangGraph 执行中 LLM 调用失败 → 重试 1 次后抛出，前端显示 "分析失败"
- Tool 调用超时（10s）→ 跳过该工具，LLM 收到 error observation 后继续
- debate 中一方连续 3 轮无新论据 → 触发 early stop，视为该方认输
- 用户上传的角色 ID 与内置冲突 → 拒绝上传，返回 409

## 注意事项

- LangGraph `StateGraph` 的 state schema 用 Zod 定义，与 agent 的 `output_schema` 无缝衔接
- `createToolCallingAgent` 的 tool calling 格式需与 DeepSeek/OpenAI/Anthropic 三个 provider 兼容 — 通过 `bindTools` 适配
- debate subgraph 内每个发言步骤会产生多条消息（think + tool_call + tool_result + final），前端需要折叠显示
- DB 中用户角色与 `user_id` 绑定，内置角色对所有用户可见
- `user_roles` 表需配合 SaaS repo 中的 `users.db`
- 测试：YAML schema 校验 → Vitest 单元测试；LangGraph workflow 执行 → 集成测试用 FakeLLM；debate 逻辑 → 状态机测试
