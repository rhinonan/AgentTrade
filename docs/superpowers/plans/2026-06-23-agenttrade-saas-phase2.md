# AgentTrade SaaS Phase 2 — 会员 + 配额 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现订阅计划体系 + 两阶段配额计数（预扣/退还）+ 计划/配额 API

**Architecture:** 开源仓库新增 `QuotaHook` 接口（与 `AuthAdapter` 同模式），`analyze/route.ts` 在分析前后调用 `tryConsume`/`release`。SaaS 仓库新增 `lib/billing/`（plans、quota-repo、subscription-repo、quota-hook），注入 `RealQuotaHook` 到开源全局单例，更新 `RealAuthAdapter` 用 repo 替代直接 SQL。

**Tech Stack:** better-sqlite3, vitest（与 Phase 1 相同）

## Global Constraints

- 开源仓库仅新增接口 + 可选调用，不引入 SaaS 依赖
- `getQuotaHook()` 返回 null 时开源版行为不变（向后兼容）
- `quotas.month` 对 free（终身）用户值为 `"*"`，pro/max 为 `"YYYY-MM"` 格式
- free = 5 次终身，pro = 100/月，max = 300/月
- 两阶段配额：analyze route 调 `tryConsume`（预扣）→ 成功保持 → 失败调 `release`（退还）
- 新用户注册自动创建 free 订阅
- ESM 模块，`.js` 后缀导入

---

## 文件结构

```
开源仓库（D:\Code2\agent-trade\nextjs-app\）:
  lib/auth/types.ts            ← +QuotaHook 接口 + 全局单例
  app/api/analyze/route.ts     ← +tryConsume/release 调用

SaaS 仓库（D:\Code2\agenttrade-saas\）:
  lib/billing/
    plans.ts                   ← 计划常量
    quota-repo.ts              ← QuotaRepo
    subscription-repo.ts       ← SubscriptionRepo
    quota-hook.ts              ← RealQuotaHook implements QuotaHook
  lib/auth/adapter.ts          ← 改用 QuotaRepo / SubscriptionRepo
  app/init-auth.ts             ← +setQuotaHook 注入
  app/api/auth/signup/route.ts ← +自动创建 free 订阅
  app/api/billing/plans/route.ts   ← GET 计划列表
  app/api/user/quota/route.ts      ← GET 用户配额
```

---

### Task 1: 开源仓库 — QuotaHook 接口 + 全局单例

**Files:**
- Modify: `D:\Code2\agent-trade\nextjs-app\lib\auth\types.ts`

**Interfaces:**
- Produces: `QuotaHook` 接口、`getQuotaHook()` / `setQuotaHook()` 全局单例

- [ ] **Step 1: 在 types.ts 末尾追加接口和单例**

```typescript
// lib/auth/types.ts — 在文件末尾追加以下代码

/** 配额钩子接口——开源仓库只定义接口，私有仓库注入实现 */
export interface QuotaHook {
  /**
   * 分析开始前预扣配额。
   * @returns true=配额已扣，false=配额不足（上游应返回 429）
   */
  tryConsume(userId: string): Promise<boolean>;

  /**
   * 分析失败时退还配额（仅在 tryConsume 成功后调用）。
   * 成功完成的分析不调用此方法。
   */
  release(userId: string): Promise<void>;
}

/** 全局单例——默认无钩子，私有仓库调用 setQuotaHook() 注入 */
let _quotaHook: QuotaHook | null = null;

export function getQuotaHook(): QuotaHook | null {
  return _quotaHook;
}

export function setQuotaHook(hook: QuotaHook): void {
  _quotaHook = hook;
}
```

- [ ] **Step 2: 运行开源仓库现有测试确认无回归**

```bash
cd D:/Code2/agent-trade/nextjs-app && pnpm vitest run lib/auth lib/db app/api/analyze app/api/session app/api/sessions
```

预期：所有现有测试 PASS

- [ ] **Step 3: Commit**

```bash
cd D:/Code2/agent-trade && git add nextjs-app/lib/auth/types.ts
git commit -m "feat: add QuotaHook interface and global singleton"
```

---

### Task 2: 开源仓库 — analyze/route.ts 调用 quota hook

**Files:**
- Modify: `D:\Code2\agent-trade\nextjs-app\app\api\analyze\route.ts`

**Interfaces:**
- Consumes: `getQuotaHook` from Task 1
- Produces: 分析开始前调 `tryConsume`，失败时调 `release`

- [ ] **Step 1: 修改 route.ts**

```typescript
// app/api/analyze/route.ts — 修改 POST 函数和 runAnalysis 函数

import { getQuotaHook } from "@/lib/auth/types.js";  // 加到现有 import 中

// POST 函数中，在创建 DB 记录之前加配额预扣
export async function POST(req: NextRequest) {
  const body = await req.json();
  // ... 现有参数解析保持不变 ...

  const sessionId = randomUUID();
  const userId = req.headers.get("x-user-id") ?? "anonymous";

  // 配额预扣（私有仓库注入的 QuotaHook）
  if (userId !== "anonymous") {
    const quotaHook = getQuotaHook();
    if (quotaHook) {
      const ok = await quotaHook.tryConsume(userId);
      if (!ok) {
        return NextResponse.json(
          { error: "本月分析次数已用完，请升级订阅" },
          { status: 429 }
        );
      }
    }
  }

  // ... 现有的 DB 插入 + runAnalysis 调用保持不变 ...
  const db = getDb();
  const repo = new AnalysisRepo(db);
  repo.create({ /* ... */ });

  // 将 quotaHook 传入 runAnalysis 以便失败时退还（匿名用户不传）
  const quotaHook = getQuotaHook();
  runAnalysis(sessionId, { /* ... */ }, userId !== "anonymous" ? quotaHook : null)
    .catch(async (err) => {
      // ... 现有 error handling 保持不变 ...
    });

  return NextResponse.json({ sessionId });
}

// runAnalysis 函数签名加第三个参数
async function runAnalysis(
  sessionId: string,
  dto: { /* ... 现有参数 ... */ },
  quotaHook: QuotaHook | null,  // 新增
): Promise<void> {
  const db = getDb();
  const repo = new AnalysisRepo(db);
  const io = getSocketIO();
  const ns = io.of("/analysis");

  // ... 现有逻辑保持不变 ...

  try {
    // ... 现有 scheduler.execute 逻辑 ...

    // 成功 — 配额保持已扣，不调 release
    repo.update(sessionId, { status: "complete", context: "..." });
    ns.to(sessionId).emit(WS_EVENTS.ANALYSIS_COMPLETE, { ... });

  } catch (err) {
    // 失败 — 退还配额
    console.error(`Analysis ${sessionId} failed:`, err);
    if (quotaHook) {
      quotaHook.release(dto.userId).catch(e =>
        console.error(`Quota release failed for ${dto.userId}:`, e)
      );
    }
    repo.update(sessionId, { status: "error", context: "..." });
    ns.to(sessionId).emit(WS_EVENTS.ANALYSIS_ERROR, { ... });
  }
}
```

注意：需要把 `userId` 传入 `runAnalysis` 的 `dto` 中（`dto.userId`），以便 catch 分支能用它调用 `release`。

完整改动要点：
1. 在 import 中加 `getQuotaHook`
2. 在 POST 中 DB 插入之前加 `tryConsume` 调用，false → 429
3. `runAnalysis` 签名加 `quotaHook` 参数
4. 把 `runAnalysis` 内部的 `.catch()` 逻辑移到 `try/catch` 内，catch 中调 `release`
5. 确保 `dto` 中携带 `userId` 供 catch 使用

- [ ] **Step 2: 运行开源仓库测试**

```bash
cd D:/Code2/agent-trade/nextjs-app && pnpm vitest run app/api/analyze lib/auth
```

预期：所有测试 PASS（开源版 `getQuotaHook()` 返回 null，行为不变）

- [ ] **Step 3: Commit**

```bash
cd D:/Code2/agent-trade && git add nextjs-app/app/api/analyze/route.ts
git commit -m "feat: integrate QuotaHook into analyze route (tryConsume/release)"
```

---

### Task 3: 计划常量定义

**Files:**
- Create: `D:\Code2\agenttrade-saas\lib\billing\plans.ts`

**Interfaces:**
- Produces: `PLANS` 常量、`PlanDefinition` 类型、`getPlan(planId)` 查询函数

- [ ] **Step 1: 创建 plans.ts**

```typescript
// lib/billing/plans.ts

export interface PlanDefinition {
  id: "free" | "pro" | "max";
  name: string;
  quotaLimit: number;
  period: "lifetime" | "monthly";
}

export const PLANS: Record<string, PlanDefinition> = {
  free: { id: "free", name: "免费版", quotaLimit: 5, period: "lifetime" },
  pro:  { id: "pro",  name: "专业版", quotaLimit: 100, period: "monthly" },
  max:  { id: "max",  name: "旗舰版", quotaLimit: 300, period: "monthly" },
};

export function getPlan(planId: string): PlanDefinition | undefined {
  return PLANS[planId];
}

/** 所有公开的计划列表（不含内部管理字段） */
export function listPlans(): PlanDefinition[] {
  return Object.values(PLANS);
}
```

- [ ] **Step 2: 验证编译**

```bash
cd D:/Code2/agenttrade-saas && pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add lib/billing/plans.ts && git commit -m "feat: add plan constants (free/pro/max)"
```

---

### Task 4: QuotaRepo

**Files:**
- Create: `D:\Code2\agenttrade-saas\lib\billing\quota-repo.ts`
- Create: `D:\Code2\agenttrade-saas\lib\billing\__tests__\quota-repo.test.ts`

**Interfaces:**
- Consumes: `getUsersDb()` from Phase 1
- Produces:
  - `QuotaRepo.increment(userId: string, month: string): void`
  - `QuotaRepo.decrement(userId: string, month: string): void`
  - `QuotaRepo.getUsage(userId: string, month?: string): number`
    - `month` 省略 → lifetime 模式：`SUM(count)` 全部月份
    - `month` 指定 → monthly 模式：精确月份

- [ ] **Step 1: 创建 quota-repo.ts**

```typescript
// lib/billing/quota-repo.ts
import type Database from "better-sqlite3";
import { getUsersDb } from "@/lib/db/client.js";

export class QuotaRepo {
  constructor(private db: Database.Database) {}

  /** 配额 +1（UPSERT） */
  increment(userId: string, month: string): void {
    this.db.prepare(
      `INSERT INTO quotas (user_id, month, count) VALUES (?, ?, 1)
       ON CONFLICT(user_id, month) DO UPDATE SET count = count + 1`
    ).run(userId, month);
  }

  /** 配额 -1（最小为 0） */
  decrement(userId: string, month: string): void {
    this.db.prepare(
      `UPDATE quotas SET count = MAX(0, count - 1)
       WHERE user_id = ? AND month = ?`
    ).run(userId, month);
  }

  /**
   * 查询已用配额。
   * @param month 省略时返回终身总额（SUM 所有月份），指定时返回该月配额
   */
  getUsage(userId: string, month?: string): number {
    if (month) {
      const row = this.db.prepare(
        `SELECT count FROM quotas WHERE user_id = ? AND month = ?`
      ).get(userId, month) as { count: number } | undefined;
      return row?.count ?? 0;
    } else {
      const row = this.db.prepare(
        `SELECT COALESCE(SUM(count), 0) as total FROM quotas WHERE user_id = ?`
      ).get(userId) as { total: number };
      return row.total;
    }
  }
}

/** 快捷工厂——从 getUsersDb 创建 */
export function createQuotaRepo(): QuotaRepo {
  return new QuotaRepo(getUsersDb());
}
```

- [ ] **Step 2: 创建测试**

```typescript
// lib/billing/__tests__/quota-repo.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { QuotaRepo } from "../quota-repo.js";
import { run as runMigration001 } from "@/lib/db/migrations/001-init.js";

describe("QuotaRepo", () => {
  let db: Database.Database;
  let repo: QuotaRepo;

  beforeEach(() => {
    db = new Database(":memory:");
    runMigration001(db);
    repo = new QuotaRepo(db);
  });

  afterEach(() => db.close());

  it("increment adds count for a user/month", () => {
    repo.increment("u1", "2026-06");
    expect(repo.getUsage("u1", "2026-06")).toBe(1);
  });

  it("increment on same user/month accumulates", () => {
    repo.increment("u1", "2026-06");
    repo.increment("u1", "2026-06");
    expect(repo.getUsage("u1", "2026-06")).toBe(2);
  });

  it("decrement reduces count", () => {
    repo.increment("u1", "2026-06");
    repo.increment("u1", "2026-06");
    repo.decrement("u1", "2026-06");
    expect(repo.getUsage("u1", "2026-06")).toBe(1);
  });

  it("decrement does not go below zero", () => {
    repo.decrement("u1", "2026-06");
    expect(repo.getUsage("u1", "2026-06")).toBe(0);
  });

  it("getUsage without month returns lifetime total", () => {
    repo.increment("u1", "*");      // free user — lifetime month marker
    repo.increment("u1", "*");
    expect(repo.getUsage("u1")).toBe(2);
  });

  it("getUsage without month sums across months", () => {
    repo.increment("u2", "2026-05");
    repo.increment("u2", "2026-06");
    repo.increment("u2", "2026-06");
    expect(repo.getUsage("u2")).toBe(3);
  });

  it("getUsage returns 0 for user with no records", () => {
    expect(repo.getUsage("never_used")).toBe(0);
  });

  it("increment uses UPSERT — safe for repeated calls", () => {
    repo.increment("u3", "2026-06");
    repo.increment("u3", "2026-06");
    repo.increment("u3", "2026-06");
    expect(repo.getUsage("u3", "2026-06")).toBe(3);
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
cd D:/Code2/agenttrade-saas && pnpm vitest run lib/billing/__tests__/quota-repo.test.ts
```

预期：8 tests PASS

- [ ] **Step 4: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add lib/billing/quota-repo.ts lib/billing/__tests__/ && git commit -m "feat: add QuotaRepo with increment/decrement/getUsage"
```

---

### Task 5: SubscriptionRepo

**Files:**
- Create: `D:\Code2\agenttrade-saas\lib\billing\subscription-repo.ts`
- Create: `D:\Code2\agenttrade-saas\lib\billing\__tests__\subscription-repo.test.ts`

**Interfaces:**
- Consumes: `getUsersDb()`, `getPlan()` from Task 3
- Produces:
  - `SubscriptionRepo.createForUser(userId, planId): void`
  - `SubscriptionRepo.getByUserId(userId): Subscription | null`
  - `SubscriptionRepo.updatePlan(userId, planId): void`

- [ ] **Step 1: 创建 subscription-repo.ts**

```typescript
// lib/billing/subscription-repo.ts
import type Database from "better-sqlite3";
import { getUsersDb } from "@/lib/db/client.js";
import { getPlan } from "./plans.js";
import type { PlanDefinition } from "./plans.js";

export interface Subscription {
  userId: string;
  plan: string;
  quotaLimit: number;
  expiresAt: number | null;
}

export class SubscriptionRepo {
  constructor(private db: Database.Database) {}

  /** 为新用户创建订阅（默认 free 计划） */
  createForUser(userId: string, planId: string = "free"): Subscription {
    const plan = getPlan(planId);
    if (!plan) throw new Error(`Unknown plan: ${planId}`);

    this.db.prepare(
      `INSERT INTO subscriptions (user_id, plan, quota_limit) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO NOTHING`
    ).run(userId, plan.id, plan.quotaLimit);

    return { userId, plan: plan.id, quotaLimit: plan.quotaLimit, expiresAt: null };
  }

  /** 查询用户当前订阅 */
  getByUserId(userId: string): Subscription | null {
    const row = this.db.prepare(
      `SELECT user_id, plan, quota_limit, expires_at
       FROM subscriptions WHERE user_id = ?`
    ).get(userId) as any;
    if (!row) return null;
    return {
      userId: row.user_id,
      plan: row.plan,
      quotaLimit: row.quota_limit,
      expiresAt: row.expires_at,
    };
  }

  /** 获取用户的计划定义（含 period） */
  getPlanForUser(userId: string): (PlanDefinition & { quotaLimit: number }) | null {
    const sub = this.getByUserId(userId);
    if (!sub) return null;
    const plan = getPlan(sub.plan);
    if (!plan) return null;
    return { ...plan, quotaLimit: sub.quotaLimit };
  }

  /** 升级/降级计划 */
  updatePlan(userId: string, planId: string): Subscription {
    const plan = getPlan(planId);
    if (!plan) throw new Error(`Unknown plan: ${planId}`);

    this.db.prepare(
      `UPDATE subscriptions SET plan = ?, quota_limit = ? WHERE user_id = ?`
    ).run(plan.id, plan.quotaLimit, userId);

    return { userId, plan: plan.id, quotaLimit: plan.quotaLimit, expiresAt: null };
  }
}

export function createSubscriptionRepo(): SubscriptionRepo {
  return new SubscriptionRepo(getUsersDb());
}
```

- [ ] **Step 2: 创建测试**

```typescript
// lib/billing/__tests__/subscription-repo.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { SubscriptionRepo } from "../subscription-repo.js";
import { run as runMigration001 } from "@/lib/db/migrations/001-init.js";

describe("SubscriptionRepo", () => {
  let db: Database.Database;
  let repo: SubscriptionRepo;

  beforeEach(() => {
    db = new Database(":memory:");
    runMigration001(db);
    // subscriptions 需要 users 表的外键 — 先插入一个虚拟用户
    db.prepare(`INSERT INTO users (id, email, role, banned) VALUES (?, ?, 'user', 0)`).run("u1", "test@test.com");
    db.prepare(`INSERT INTO users (id, email, role, banned) VALUES (?, ?, 'user', 0)`).run("u2", "other@test.com");
    repo = new SubscriptionRepo(db);
  });

  afterEach(() => db.close());

  it("createForUser creates free subscription by default", () => {
    const sub = repo.createForUser("u1");
    expect(sub.plan).toBe("free");
    expect(sub.quotaLimit).toBe(5);

    const found = repo.getByUserId("u1");
    expect(found).not.toBeNull();
    expect(found!.quotaLimit).toBe(5);
  });

  it("createForUser supports pro plan", () => {
    const sub = repo.createForUser("u2", "pro");
    expect(sub.plan).toBe("pro");
    expect(sub.quotaLimit).toBe(100);
  });

  it("createForUser with ON CONFLICT does not overwrite", () => {
    repo.createForUser("u1", "free");
    repo.createForUser("u1", "pro");  // should be no-op
    const sub = repo.getByUserId("u1");
    expect(sub!.plan).toBe("free");  // unchanged
  });

  it("getByUserId returns null for missing user", () => {
    expect(repo.getByUserId("nonexistent")).toBeNull();
  });

  it("getPlanForUser returns plan definition with period", () => {
    repo.createForUser("u1", "free");
    const plan = repo.getPlanForUser("u1");
    expect(plan).not.toBeNull();
    expect(plan!.period).toBe("lifetime");
  });

  it("updatePlan changes subscription", () => {
    repo.createForUser("u1", "free");
    repo.updatePlan("u1", "pro");
    const sub = repo.getByUserId("u1");
    expect(sub!.plan).toBe("pro");
    expect(sub!.quotaLimit).toBe(100);
  });

  it("updatePlan throws on unknown plan", () => {
    repo.createForUser("u1", "free");
    expect(() => repo.updatePlan("u1", "nonexistent")).toThrow("Unknown plan");
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
cd D:/Code2/agenttrade-saas && pnpm vitest run lib/billing/__tests__/subscription-repo.test.ts
```

预期：7 tests PASS

- [ ] **Step 4: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add lib/billing/subscription-repo.ts lib/billing/__tests__/ && git commit -m "feat: add SubscriptionRepo with createForUser/getPlanForUser/updatePlan"
```

---

### Task 6: RealQuotaHook（实现开源 QuotaHook 接口）

**Files:**
- Create: `D:\Code2\agenttrade-saas\lib\billing\quota-hook.ts`
- Create: `D:\Code2\agenttrade-saas\lib\billing\__tests__\quota-hook.test.ts`

**Interfaces:**
- Consumes: `QuotaRepo` from Task 4, `SubscriptionRepo` from Task 5, `QuotaHook` from Task 1
- Produces: `RealQuotaHook implements QuotaHook`

- [ ] **Step 1: 创建 quota-hook.ts**

```typescript
// lib/billing/quota-hook.ts
import type { QuotaHook } from "agenttrade/lib/auth/types.js";
import { createQuotaRepo } from "./quota-repo.js";
import { createSubscriptionRepo } from "./subscription-repo.js";

export class RealQuotaHook implements QuotaHook {
  private quotaRepo = createQuotaRepo();
  private subscriptionRepo = createSubscriptionRepo();

  async tryConsume(userId: string): Promise<boolean> {
    const plan = this.subscriptionRepo.getPlanForUser(userId);
    if (!plan) return false; // 无订阅 → 拒绝

    const limit = plan.quotaLimit;
    if (limit === -1) {
      // 无限制（当前设计无此层级，保留兼容）
      this.quotaRepo.increment(userId, "*");
      return true;
    }

    const month = plan.period === "lifetime" ? "*" : new Date().toISOString().slice(0, 7);
    const used = this.quotaRepo.getUsage(
      userId,
      plan.period === "lifetime" ? undefined : month
    );

    if (used >= limit) {
      return false; // 配额已用完
    }

    this.quotaRepo.increment(userId, month);
    return true;
  }

  async release(userId: string): Promise<void> {
    const plan = this.subscriptionRepo.getPlanForUser(userId);
    if (!plan) return;

    const month = plan.period === "lifetime" ? "*" : new Date().toISOString().slice(0, 7);
    this.quotaRepo.decrement(userId, month);
  }
}
```

- [ ] **Step 2: 创建测试**

```typescript
// lib/billing/__tests__/quota-hook.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { QuotaRepo } from "../quota-repo.js";
import { SubscriptionRepo } from "../subscription-repo.js";
import { RealQuotaHook } from "../quota-hook.js";
import { run as runMigration001 } from "@/lib/db/migrations/001-init.js";
import { setUsersDb, resetUsersDb } from "@/lib/db/client.js";

describe("RealQuotaHook", () => {
  let db: Database.Database;
  let hook: RealQuotaHook;

  beforeEach(() => {
    db = new Database(":memory:");
    runMigration001(db);
    db.prepare(`INSERT INTO users (id, email, role, banned) VALUES (?, ?, 'user', 0)`).run("u1", "a@test.com");
    db.prepare(`INSERT INTO users (id, email, role, banned) VALUES (?, ?, 'user', 0)`).run("u2", "b@test.com");
    setUsersDb(db);
    hook = new RealQuotaHook();
  });

  afterEach(() => {
    resetUsersDb();
    db.close();
  });

  it("tryConsume returns false when user has no subscription", async () => {
    const ok = await hook.tryConsume("no-sub");
    expect(ok).toBe(false);
  });

  it("tryConsume allows analysis when under quota", async () => {
    // Manually create subscription since hook expects it
    db.prepare(`INSERT INTO subscriptions (user_id, plan, quota_limit) VALUES (?, 'free', 5)`).run("u1");
    const ok = await hook.tryConsume("u1");
    expect(ok).toBe(true);
  });

  it("tryConsume returns false when quota exhausted (free lifetime)", async () => {
    db.prepare(`INSERT INTO subscriptions (user_id, plan, quota_limit) VALUES (?, 'free', 5)`).run("u1");
    // Pre-fill quota to limit
    for (let i = 0; i < 5; i++) {
      db.prepare(`INSERT INTO quotas (user_id, month, count) VALUES (?, '*', 1)
        ON CONFLICT(user_id, month) DO UPDATE SET count = count + 1`).run("u1");
    }
    const ok = await hook.tryConsume("u1");
    expect(ok).toBe(false);
  });

  it("tryConsume still allows when one below limit", async () => {
    db.prepare(`INSERT INTO subscriptions (user_id, plan, quota_limit) VALUES (?, 'free', 5)`).run("u1");
    for (let i = 0; i < 4; i++) {
      db.prepare(`INSERT INTO quotas (user_id, month, count) VALUES (?, '*', 1)
        ON CONFLICT(user_id, month) DO UPDATE SET count = count + 1`).run("u1");
    }
    const ok = await hook.tryConsume("u1");
    expect(ok).toBe(true);
  });

  it("release decrements quota", async () => {
    db.prepare(`INSERT INTO subscriptions (user_id, plan, quota_limit) VALUES (?, 'free', 5)`).run("u1");
    await hook.tryConsume("u1");
    await hook.tryConsume("u1");
    await hook.release("u1");

    const quotaRepo = new QuotaRepo(db);
    expect(quotaRepo.getUsage("u1")).toBe(1);
  });

  it("monthly plan uses current month key", async () => {
    db.prepare(`INSERT INTO subscriptions (user_id, plan, quota_limit) VALUES (?, 'pro', 100)`).run("u2");
    const month = new Date().toISOString().slice(0, 7);
    const ok = await hook.tryConsume("u2");
    expect(ok).toBe(true);

    const quotaRepo = new QuotaRepo(db);
    expect(quotaRepo.getUsage("u2", month)).toBe(1);
  });
});
```

- [ ] **Step 3: 运行测试**

需要注入 users.db 连接。测试前调 `setUsersDb()` 或在 beforeEach 中替换。

```bash
cd D:/Code2/agenttrade-saas && pnpm vitest run lib/billing/__tests__/quota-hook.test.ts
```

预期：6 tests PASS

- [ ] **Step 4: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add lib/billing/quota-hook.ts lib/billing/__tests__/ && git commit -m "feat: add RealQuotaHook implementing QuotaHook"
```

---

### Task 7: init-auth.ts — 注入 QuotaHook

**Files:**
- Modify: `D:\Code2\agenttrade-saas\app\init-auth.ts`

**Interfaces:**
- Consumes: `setQuotaHook` from Task 1, `RealQuotaHook` from Task 6
- Produces: 启动时 `setQuotaHook(new RealQuotaHook())`

- [ ] **Step 1: 修改 init-auth.ts**

```typescript
// app/init-auth.ts — 在现有 setAuthAdapter 调用后追加

import { setQuotaHook } from "agenttrade/lib/auth/types.js";
import { RealQuotaHook } from "@/lib/billing/quota-hook.js";

// 在现有的 initAuth() 函数中添加：
export function initAuth(): void {
  // ... 现有的 setAuthAdapter(new RealAuthAdapter()) ...

  setQuotaHook(new RealQuotaHook());
}
```

- [ ] **Step 2: 验证编译**

```bash
cd D:/Code2/agenttrade-saas && pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add app/init-auth.ts && git commit -m "feat: inject RealQuotaHook via setQuotaHook"
```

---

### Task 8: signup route — 自动创建 free 订阅

**Files:**
- Modify: `D:\Code2\agenttrade-saas\app\api\auth\signup\route.ts`

**Interfaces:**
- Consumes: `SubscriptionRepo` from Task 5
- Produces: 注册后自动创建 free 订阅

- [ ] **Step 1: 修改 signup route**

在 `signup/route.ts` 中，`userRepo.create()` 成功之后，添加订阅创建：

```typescript
// 在现有 userRepo.create() 后、生成 token 前添加：

// 自动创建 free 订阅
const subscriptionRepo = createSubscriptionRepo();
subscriptionRepo.createForUser(user.id, "free");

// ... 后续 token 生成和邮件发送保持不变 ...
```

需要在文件顶部加 import：
```typescript
import { createSubscriptionRepo } from "@/lib/billing/subscription-repo.js";
```

- [ ] **Step 2: 验证编译**

```bash
cd D:/Code2/agenttrade-saas && pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add app/api/auth/signup/route.ts && git commit -m "feat: auto-create free subscription on signup"
```

---

### Task 9: RealAuthAdapter — 改用 repo 层

**Files:**
- Modify: `D:\Code2\agenttrade-saas\lib\auth\adapter.ts`

**Interfaces:**
- Consumes: `QuotaRepo` from Task 4, `SubscriptionRepo` from Task 5
- Produces: `getQuotaLimit()` / `getQuotaUsed()` 通过 repo 读取，适配 lifetime vs monthly

- [ ] **Step 1: 重写 adapter.ts 的配额方法**

```typescript
// lib/auth/adapter.ts — 替换 getQuotaLimit 和 getQuotaUsed 方法

import { createQuotaRepo } from "@/lib/billing/quota-repo.js";
import { createSubscriptionRepo } from "@/lib/billing/subscription-repo.js";

export class RealAuthAdapter implements AuthAdapter {
  private userRepo: UserRepo;
  private subscriptionRepo = createSubscriptionRepo();
  private quotaRepo = createQuotaRepo();

  constructor() {
    const db = getUsersDb();
    this.userRepo = new UserRepo(db);
  }

  // getSession 保持不变...
  // hasPermission 保持不变...

  async getQuotaLimit(user: User): Promise<number> {
    const sub = this.subscriptionRepo.getByUserId(user.id);
    return sub?.quotaLimit ?? 0; // 无订阅 → 配额为 0
  }

  async getQuotaUsed(user: User): Promise<number> {
    const plan = this.subscriptionRepo.getPlanForUser(user.id);
    if (!plan) return 0;

    if (plan.period === "lifetime") {
      return this.quotaRepo.getUsage(user.id); // 终身总额
    } else {
      const month = new Date().toISOString().slice(0, 7);
      return this.quotaRepo.getUsage(user.id, month); // 当月
    }
  }
}
```

- [ ] **Step 2: 更新 adapter 测试**

```typescript
// lib/auth/__tests__/adapter.test.ts — 更新配额相关测试

// 已有的 getQuotaLimit / getQuotaUsed 测试需要先创建 subscriptions 行
// 在 beforeEach 中为测试用户创建订阅：
beforeEach(() => {
  // ... 现有 setup ...
  db.prepare(`INSERT INTO users (id, email, role, banned) VALUES ('u1', 'u1@test.com', 'user', 0)`).run();
  db.prepare(`INSERT INTO subscriptions (user_id, plan, quota_limit) VALUES ('u1', 'free', 5)`).run();
});

// 更新 "getQuotaLimit returns 10 by default" → 应返回 5 (free plan)
// 更新 "getQuotaUsed returns 0 when no usage recorded" → 保持不变，添加 subscriptions 行即可
```

- [ ] **Step 3: 运行测试**

```bash
cd D:/Code2/agenttrade-saas && pnpm vitest run lib/auth/__tests__/adapter.test.ts lib/billing/__tests__/
```

预期：所有测试 PASS

- [ ] **Step 4: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add lib/auth/adapter.ts lib/auth/__tests__/adapter.test.ts && git commit -m "feat: refactor RealAuthAdapter to use QuotaRepo/SubscriptionRepo"
```

---

### Task 10: GET /api/billing/plans

**Files:**
- Create: `D:\Code2\agenttrade-saas\app\api\billing\plans\route.ts`

**Interfaces:**
- Consumes: `listPlans()` from Task 3
- Produces: 返回所有可用计划

- [ ] **Step 1: 创建 route**

```typescript
// app/api/billing/plans/route.ts
import { NextResponse } from "next/server";
import { listPlans } from "@/lib/billing/plans.js";

export async function GET() {
  const plans = listPlans().map((p) => ({
    id: p.id,
    name: p.name,
    quotaLimit: p.quotaLimit,
    period: p.period,
  }));

  return NextResponse.json({ plans });
}
```

- [ ] **Step 2: 验证编译**

```bash
cd D:/Code2/agenttrade-saas && pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add app/api/billing/ && git commit -m "feat: add GET /api/billing/plans"
```

---

### Task 11: GET /api/user/quota

**Files:**
- Create: `D:\Code2\agenttrade-saas\app\api\user\quota\route.ts`

**Interfaces:**
- Consumes: `x-user-id` header, `getAuthAdapter()` from agenttrade
- Produces: 用户当前计划和配额使用情况

- [ ] **Step 1: 创建 route**

```typescript
// app/api/user/quota/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthAdapter } from "agenttrade/lib/auth/types.js";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") ?? "anonymous";
  if (userId === "anonymous") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = getAuthAdapter();
  const limit = await auth.getQuotaLimit({ id: userId, name: "", role: "user" });
  const used = await auth.getQuotaUsed({ id: userId, name: "", role: "user" });

  return NextResponse.json({
    plan: limit === 5 ? "free" : limit === 100 ? "pro" : limit === 300 ? "max" : "unknown",
    quotaLimit: limit,
    quotaUsed: used,
    quotaRemaining: Math.max(0, limit - used),
  });
}
```

- [ ] **Step 2: 验证编译**

```bash
cd D:/Code2/agenttrade-saas && pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add app/api/user/ && git commit -m "feat: add GET /api/user/quota"
```

---

### Task 12: 端到端验证

**Files:**
- 无新文件

- [ ] **Step 1: 运行所有 SaaS 测试**

```bash
cd D:/Code2/agenttrade-saas && pnpm test
```

预期：所有测试 PASS（含新加的 billing 测试）

- [ ] **Step 2: 运行开源仓库测试确认无回归**

```bash
cd D:/Code2/agent-trade/nextjs-app && pnpm vitest run
```

预期：现有测试 PASS（305 tests）

- [ ] **Step 3: 验证构建**

```bash
cd D:/Code2/agenttrade-saas && pnpm build 2>&1 | tail -10
```

预期：构建成功

- [ ] **Step 4: Commit any fixes**

```bash
cd D:/Code2/agenttrade-saas && git add -A && git commit -m "chore: Phase 2 integration fixes"
```
