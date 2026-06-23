# AgentTrade SaaS Phase 2 — 会员 + 配额 设计 Spec

**Date:** 2026-06-23
**Status:** 设计确认

## 背景

Phase 1 完成了基础认证（NextAuth v5 + 注册/登录 + RealAuthAdapter）。Phase 2 在 Phase 1 之上增加会员计划和配额管理。

Phase 1 已有的基础：
- `subscriptions` 和 `quotas` 表已在 migration 中创建
- `RealAuthAdapter.getQuotaLimit()` / `getQuotaUsed()` 已读取这两个表
- middleware 已做配额余量检查（used >= limit → 429）
- 但**没有配额计数逻辑**（没有 increment/decrement）

## 目标

1. **订阅计划**：free（5 次终身）、pro（100/月）、max（300/月）
2. **配额钩子**：开源仓库导出 `QuotaHook` 接口，分析 route 调 `tryConsume`/`release`
3. **配额计数**：两阶段模型——分析开始预扣，失败退还
4. **注册默认订阅**：新用户自动获得 free 订阅
5. **计划/配额 API**：前端可查询计划列表和用户配额状态

## 架构

### 开源仓库变更（~30 行）

```
lib/auth/types.ts:
  + QuotaHook 接口 { tryConsume(userId): bool; release(userId): void }
  + getQuotaHook() / setQuotaHook() 全局单例

app/api/analyze/route.ts:
  + 调 getQuotaHook()?.tryConsume(userId) — false → 429
  + catch 分支调 getQuotaHook()?.release(userId)
```

### SaaS 仓库新增

```
lib/billing/
├── plans.ts              ← 计划常量 + 查询函数
├── quota-repo.ts         ← QuotaRepo (increment/decrement/getUsage)
├── subscription-repo.ts  ← SubscriptionRepo (createForUser/getPlan/update)
└── quota-hook.ts         ← RealQuotaHook implements QuotaHook

app/api/
├── billing/plans/route.ts    ← GET 计划列表
└── user/quota/route.ts       ← GET 当前用户配额状态
```

### 修改

```
instrumentation.ts (或 init-auth.ts):
  + setQuotaHook(new RealQuotaHook()) 注入

app/api/auth/signup/route.ts:
  + subscriptionRepo.createForUser(userId, "free")

middleware.ts:
  + 配额检查适配终身模式（free 不按月重置，查总额）
```

## 计划定义

```typescript
const PLANS = {
  free:       { name: "免费版", quotaLimit: 5,   period: "lifetime" },
  pro:        { name: "专业版", quotaLimit: 100, period: "monthly"  },
  max:        { name: "旗舰版", quotaLimit: 300, period: "monthly"  },
} as const;
```

- `period: "lifetime"` → 查 quotas 表 `SUM(count)` 不限月份
- `period: "monthly"` → 查 quotas 表当月 count

## 配额数据流

```
POST /api/analyze
  │
  ├─ middleware (Phase 1 已有):
  │    auth.getQuotaUsed() >= auth.getQuotaLimit() → 429
  │
  ├─ route (新增):
  │    quotaHook.tryConsume(userId)
  │      ├─ true → quotaRepo.increment(userId, month)
  │      └─ false → 429 (剩余配额不足)
  │
  ├─ runAnalysis()...
  │
  ├─ 成功 → 配额保持
  └─ 失败 → catch { quotaHook.release(userId) }
       └─ quotaRepo.decrement(userId, month)
```

## QuotaRepo 接口

```typescript
class QuotaRepo {
  increment(userId: string, month: string): void;
  decrement(userId: string, month: string): void;
  getUsage(userId: string, month?: string): number;  // month 省略=终身总合
}
```

## SubscriptionRepo 接口

```typescript
class SubscriptionRepo {
  createForUser(userId: string, plan: string): void;
  getPlan(userId: string): { plan: string; quotaLimit: number } | null;
  updatePlan(userId: string, plan: string, quotaLimit: number): void;
}
```

## API 路由

### GET /api/billing/plans

```json
{
  "plans": [
    { "id": "free", "name": "免费版", "quotaLimit": 5, "period": "lifetime" },
    { "id": "pro", "name": "专业版", "quotaLimit": 100, "period": "monthly" },
    { "id": "max", "name": "旗舰版", "quotaLimit": 300, "period": "monthly" }
  ]
}
```

### GET /api/user/quota

```json
{
  "plan": "free",
  "period": "lifetime",
  "quotaLimit": 5,
  "quotaUsed": 3,
  "quotaRemaining": 2
}
```

## 注意事项

- `quotas.month` 字段对 free 用户值为 `"*"`（终身），pro/max 为 `"2026-06"` 格式
- `RealAuthAdapter.getQuotaUsed()` 需适配：free 调 `SUM(count) WHERE user_id = ?`，pro/max 调 `WHERE month = ?`
- middleware 配额检查依赖 `auth.getQuotaUsed()`，适配后自动生效
- `getQuotaHook()` 返回 null 时开源版行为不变（向后兼容）
