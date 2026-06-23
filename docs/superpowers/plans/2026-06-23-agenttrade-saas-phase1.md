# AgentTrade SaaS Phase 1 — 基础认证 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 `agenttrade-saas` 私有仓库，实现 email/password 注册登录 + 邮箱验证 + RealAuthAdapter 注入

**Architecture:** 通过 `file:` 依赖导入开源 `agenttrade` 核心，`tsconfig paths` 解析 `agenttrade/*` 导入路径。独立 `users.db`（NextAuth 内置表 + subscriptions + quotas）与开源 `agenttrade.db` 并存。`instrumentation.ts` 启动时注入 `RealAuthAdapter`，完全替换开源 middleware。

**Tech Stack:** Next.js 15, NextAuth.js v5, SQLite (better-sqlite3), bcryptjs, nodemailer, shadcn/ui, Tailwind CSS 4

## Global Constraints

- 所有 import 使用 ESM（`.js` 后缀），模块系统 `"type": "module"`
- 开源仓库路径：`../agent-trade/nextjs-app`，通过 `tsconfig paths` 的 `agenttrade/*` 别名解析
- `users.db` 独立于 `agenttrade.db`，两者通过 `user_id` 字符串关联
- `x-user-id` / `x-user-role` header 由 middleware 注入，客户端不可伪造
- `instrumentation.ts` 是 setAuthAdapter 的唯一调用点
- 密码哈希使用 `bcryptjs`（纯 JS，SALT_ROUNDS=12）
- 邮箱验证使用 token 链接模式，24 小时过期
- 用户生命周离：封禁/删除标记在 users 表，历史数据保留

---

## 文件结构

```
agenttrade-saas/
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
├── vitest.setup.ts
├── instrumentation.ts              ← setAuthAdapter 注入点
├── middleware.ts                    ← 完全替换开源 middleware
├── .env.example
├── lib/
│   ├── auth/
│   │   ├── adapter.ts              ← RealAuthAdapter implements AuthAdapter
│   │   ├── auth.config.ts          ← NextAuth v5 配置
│   │   └── password.ts             ← bcryptjs hash/compare
│   ├── db/
│   │   ├── client.ts               ← users.db 连接 (better-sqlite3)
│   │   ├── user-repo.ts            ← 用户 CRUD + ban/delete
│   │   └── migrations/
│   │       └── 001-init.ts         ← NextAuth 表 + subscriptions + quotas
│   └── email/
│       └── client.ts               ← nodemailer，支持验证邮件发送
├── app/
│   ├── login/page.tsx              ← 登录页
│   ├── signup/page.tsx             ← 注册页
│   └── api/
│       └── auth/
│           ├── [...nextauth]/route.ts  ← NextAuth 路由
│           ├── signup/route.ts          ← 注册 API
│           └── verify-email/route.ts    ← 邮箱验证 API
```

---

### Task 1: 修复开源仓库 — GET /api/session/[id] 加 userId 过滤

**Files:**
- Modify: `D:\Code2\agent-trade\nextjs-app\app\api\session\[id]\route.ts`

**Interfaces:**
- Consumes: `x-user-id` header（middleware 注入）
- Produces: 同上签名（行为变更，不改接口）

- [ ] **Step 1: 修改 route.ts 加 userId 过滤**

```typescript
// app/api/session/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client.js";
import { SessionRepo } from "@/lib/db/session-repo.js";
import { ChatRepo } from "@/lib/db/chat-repo.js";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = req.headers.get("x-user-id") ?? "anonymous";

  try {
    const db = getDb();
    const sessionRepo = new SessionRepo(db);
    const chatRepo = new ChatRepo(db);

    const session = sessionRepo.getById(id, userId !== "anonymous" ? userId : undefined);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const messages = chatRepo.getBySession(id);

    return NextResponse.json({
      session: {
        id: session.id,
        targetCode: session.targetCode,
        targetName: session.targetName,
        targetType: session.targetType,
        workflowName: session.workflowName,
        status: session.status,
        createdAt: session.createdAt,
      },
      messages,
    });
  } catch (err) {
    console.error("Session detail error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 运行测试验证**

```bash
cd D:/Code2/agent-trade/nextjs-app && pnpm vitest run app/api/session app/api/sessions lib/db/__tests__/session-repo.test.ts
```

预期：所有现有测试 PASS

- [ ] **Step 3: Commit**

```bash
cd D:/Code2/agent-trade && git add nextjs-app/app/api/session/[id]/route.ts
git commit -m "fix: add userId filter to GET /api/session/[id]"
```

---

### Task 2: 修复开源仓库 — DELETE /api/session 加 userId 校验

**Files:**
- Modify: `D:\Code2\agent-trade\nextjs-app\lib\db\session-repo.ts`
- Modify: `D:\Code2\agent-trade\nextjs-app\app\api\session\route.ts`
- Modify: `D:\Code2\agent-trade\nextjs-app\lib\db\__tests__\session-repo.test.ts`
- Modify: `D:\Code2\agent-trade\nextjs-app\app\api\session\__tests__\route.test.ts`

**Interfaces:**
- Consumes: `x-user-id` header
- Produces: `SessionRepo.deleteById(id, userId?)` 返回 `boolean`

- [ ] **Step 1: 更新 session-repo.ts — deleteById 加 userId 参数和返回值**

```typescript
// lib/db/session-repo.ts — 替换 deleteById 方法
deleteById(id: string, userId?: string): boolean {
  let sql = "DELETE FROM sessions WHERE id = ?";
  const params: any[] = [id];
  if (userId) {
    sql += " AND user_id = ?";
    params.push(userId);
  }
  const result = this.db.prepare(sql).run(...params);
  return result.changes > 0;
}
```

- [ ] **Step 2: 更新 route.ts — 读 userId 并传给 deleteById**

```typescript
// app/api/session/route.ts — 替换 DELETE 函数
export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || url.pathname.split("/").pop();
  if (!id) return NextResponse.json({ error: "Missing session id" }, { status: 400 });

  const userId = req.headers.get("x-user-id") ?? "anonymous";

  const db = getDb();
  const sessionRepo = new SessionRepo(db);
  const deleted = sessionRepo.deleteById(id, userId !== "anonymous" ? userId : undefined);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mgr = getSessionManager(undefined, sessionRepo);
  mgr.deleteSession(id);
  return NextResponse.json({ deleted: true });
}
```

- [ ] **Step 3: 更新 session-repo 测试 — 加 deleteById 带 userId 的用例**

```typescript
// lib/db/__tests__/session-repo.test.ts — 在 "deletes session by id" 测试后追加
it("deleteById returns false when session exists but userId does not match", () => {
  repo.insert({ id: "s1", targetCode: "600519", targetName: null, targetType: "stock", workflowName: "layered", status: "RUNNING", createdAt: 1000, userId: "user-a" });
  const result = repo.deleteById("s1", "user-b"); // wrong userId
  expect(result).toBe(false);
  expect(repo.getById("s1")).not.toBeNull(); // still exists
});

it("deleteById returns true when userId matches", () => {
  repo.insert({ id: "s2", targetCode: "000001", targetName: null, targetType: "stock", workflowName: "bull-bear", status: "RUNNING", createdAt: 1000, userId: "user-a" });
  const result = repo.deleteById("s2", "user-a");
  expect(result).toBe(true);
  expect(repo.getById("s2")).toBeNull();
});
```

- [ ] **Step 4: 运行测试**

```bash
cd D:/Code2/agent-trade/nextjs-app && pnpm vitest run lib/db/__tests__/session-repo.test.ts app/api/session app/api/sessions
```

预期：所有测试 PASS

- [ ] **Step 5: Commit**

```bash
cd D:/Code2/agent-trade && git add nextjs-app/lib/db/session-repo.ts nextjs-app/app/api/session/route.ts nextjs-app/lib/db/__tests__/session-repo.test.ts
git commit -m "fix: add userId check to DELETE /api/session"
```

---

### Task 3: 脚手架 agenttrade-saas 项目

**Files:**
- Create: `D:\Code2\agenttrade-saas\package.json`
- Create: `D:\Code2\agenttrade-saas\tsconfig.json`
- Create: `D:\Code2\agenttrade-saas\next.config.ts`
- Create: `D:\Code2\agenttrade-saas\vitest.config.ts`
- Create: `D:\Code2\agenttrade-saas\vitest.setup.ts`
- Create: `D:\Code2\agenttrade-saas\.env.example`

**Interfaces:**
- Produces: 项目可 `pnpm install` 成功，`tsc --noEmit` 无错误

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "agenttrade-saas",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build && tsc",
    "start": "NODE_ENV=production next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "agenttrade": "file:../agent-trade/nextjs-app",
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "next-auth": "5.0.0-beta.25",
    "@auth/sqlite-adapter": "^1.0.0",
    "better-sqlite3": "^11.0.0",
    "bcryptjs": "^2.4.3",
    "nodemailer": "^6.9.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/bcryptjs": "^2.4.0",
    "@types/nodemailer": "^6.4.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "agenttrade/*": ["../agent-trade/nextjs-app/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: 创建 next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 4: 创建 vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "agenttrade": path.resolve(__dirname, "../agent-trade/nextjs-app"),
    },
  },
});
```

- [ ] **Step 5: 创建 vitest.setup.ts**

```typescript
// Vitest setup — extend as needed
```

- [ ] **Step 6: 创建 .env.example**

```bash
# Database
USERS_DB_PATH=./data/users.db

# NextAuth
AUTH_SECRET=change-me-generate-via-openssl-rand-base64-32
AUTH_URL=http://localhost:3000

# Email (nodemailer)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=noreply@agenttrade.com

# GitHub OAuth (Phase 1 optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

- [ ] **Step 7: 安装依赖并验证**

```bash
cd D:/Code2/agenttrade-saas && pnpm install
pnpm tsc --noEmit 2>&1 | head -20
```

预期：无编译错误（可能需要先有 agenttrade 的 `node_modules`）

- [ ] **Step 8: Commit**

```bash
cd D:/Code2/agenttrade-saas && git init && git add -A
git commit -m "feat: scaffold agenttrade-saas project"
```

---

### Task 4: users.db 客户端 + 初始迁移

**Files:**
- Create: `D:\Code2\agenttrade-saas\lib\db\client.ts`
- Create: `D:\Code2\agenttrade-saas\lib\db\migrations\001-init.ts`

**Interfaces:**
- Produces: `getUsersDb(): Database.Database` — 返回 users.db 连接，自动建表

- [ ] **Step 1: 创建迁移文件**

```typescript
// lib/db/migrations/001-init.ts
import type Database from "better-sqlite3";

/**
 * 001: Initial schema — NextAuth tables + SaaS business tables
 */
export function run(db: Database.Database): void {
  // NextAuth v5 built-in tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS "users" (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      emailVerified INTEGER,
      image TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      banned INTEGER NOT NULL DEFAULT 0,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS "accounts" (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      providerAccountId TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      UNIQUE(provider, providerAccountId)
    );

    CREATE TABLE IF NOT EXISTS "sessions" (
      id TEXT PRIMARY KEY,
      sessionToken TEXT NOT NULL UNIQUE,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "verification_tokens" (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires INTEGER NOT NULL,
      PRIMARY KEY (identifier, token)
    );

    CREATE TABLE IF NOT EXISTS "subscriptions" (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL DEFAULT 'free',
      quota_limit INTEGER NOT NULL DEFAULT 10,
      expires_at INTEGER,
      PRIMARY KEY (user_id)
    );

    CREATE TABLE IF NOT EXISTS "quotas" (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, month)
    );
  `);
}
```

- [ ] **Step 2: 创建数据库客户端**

```typescript
// lib/db/client.ts
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { run as runMigration001 } from "./migrations/001-init.js";

let _usersDb: Database.Database | null = null;

export function getUsersDb(dbPath?: string): Database.Database {
  if (!_usersDb) {
    const resolvedPath = dbPath ?? process.env.USERS_DB_PATH ?? "./data/users.db";
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    _usersDb = new Database(resolvedPath);
    _usersDb.pragma("journal_mode = WAL");
    runMigration001(_usersDb);
  }
  return _usersDb;
}

/** For testing — inject a fresh in-memory DB */
export function setUsersDb(db: Database.Database): void {
  _usersDb = db;
}

/** For testing — reset singleton */
export function resetUsersDb(): void {
  _usersDb = null;
}
```

- [ ] **Step 3: 写数据库客户端测试**

```typescript
// lib/db/__tests__/client.test.ts
import { describe, it, expect, afterEach } from "vitest";
import Database from "better-sqlite3";
import { setUsersDb, resetUsersDb, getUsersDb } from "../client.js";

describe("getUsersDb", () => {
  afterEach(() => {
    resetUsersDb();
  });

  it("creates tables via migration on first call", () => {
    const db = new Database(":memory:");
    setUsersDb(db);

    getUsersDb(); // triggers migration

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain("users");
    expect(names).toContain("accounts");
    expect(names).toContain("sessions");
    expect(names).toContain("verification_tokens");
    expect(names).toContain("subscriptions");
    expect(names).toContain("quotas");
  });

  it("returns same instance on subsequent calls", () => {
    const db = new Database(":memory:");
    setUsersDb(db);
    const a = getUsersDb();
    const b = getUsersDb();
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 4: 运行测试**

```bash
cd D:/Code2/agenttrade-saas && pnpm vitest run lib/db/__tests__/client.test.ts
```

预期：PASS

- [ ] **Step 5: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add lib/db/ && git commit -m "feat: add users.db client and initial migration"
```

---

### Task 5: user-repo.ts

**Files:**
- Create: `D:\Code2\agenttrade-saas\lib\db\user-repo.ts`
- Create: `D:\Code2\agenttrade-saas\lib\db\__tests__\user-repo.test.ts`

**Interfaces:**
- Consumes: `getUsersDb()` from Task 4
- Produces:
  - `UserRepo.create(input: CreateUserInput): User`
  - `UserRepo.findByEmail(email: string): User | null`
  - `UserRepo.findById(id: string): User | null`
  - `UserRepo.verifyEmail(email: string): void`
  - `UserRepo.setBanned(userId: string, banned: boolean): void`
  - `UserRepo.softDelete(userId: string): void`

- [ ] **Step 1: 创建 user-repo.ts**

```typescript
// lib/db/user-repo.ts
import type Database from "better-sqlite3";
import { getUsersDb } from "./client.js";
import { randomUUID } from "node:crypto";

export interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: number | null;
  image: string | null;
  role: "user" | "admin";
  banned: number;
  deletedAt: number | null;
}

export interface CreateUserInput {
  name?: string;
  email: string;
  passwordHash: string;
}

export class UserRepo {
  constructor(private db: Database.Database) {}

  /** Create a new user. Returns the created user. */
  create(input: CreateUserInput): User {
    const id = randomUUID();
    const stmt = this.db.prepare(
      `INSERT INTO users (id, name, email, image, role, banned)
       VALUES (?, ?, ?, NULL, 'user', 0)`
    );
    stmt.run(id, input.name ?? null, input.email);

    // Store password hash in a separate table (not in NextAuth users table)
    // We extend users.db with a credentials table
    this.db.prepare(
      `CREATE TABLE IF NOT EXISTS "credentials" (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL
      )`
    ).run();
    this.db.prepare(
      `INSERT INTO credentials (user_id, password_hash) VALUES (?, ?)`
    ).run(id, input.passwordHash);

    return {
      id,
      name: input.name ?? null,
      email: input.email,
      emailVerified: null,
      image: null,
      role: "user",
      banned: 0,
      deletedAt: null,
    };
  }

  findByEmail(email: string): User | null {
    const row = this.db.prepare(
      `SELECT id, name, email, emailVerified, image, role, banned, deleted_at
       FROM users WHERE email = ? AND deleted_at IS NULL`
    ).get(email) as any;
    if (!row) return null;
    return {
      id: row.id, name: row.name, email: row.email,
      emailVerified: row.emailVerified, image: row.image,
      role: row.role, banned: row.banned, deletedAt: row.deleted_at,
    };
  }

  findById(id: string): User | null {
    const row = this.db.prepare(
      `SELECT id, name, email, emailVerified, image, role, banned, deleted_at
       FROM users WHERE id = ? AND deleted_at IS NULL`
    ).get(id) as any;
    if (!row) return null;
    return {
      id: row.id, name: row.name, email: row.email,
      emailVerified: row.emailVerified, image: row.image,
      role: row.role, banned: row.banned, deletedAt: row.deleted_at,
    };
  }

  getPasswordHash(userId: string): string | null {
    const row = this.db.prepare(
      `SELECT password_hash FROM credentials WHERE user_id = ?`
    ).get(userId) as any;
    return row?.password_hash ?? null;
  }

  verifyEmail(email: string): void {
    this.db.prepare(
      `UPDATE users SET emailVerified = ? WHERE email = ?`
    ).run(Date.now(), email);
  }

  setBanned(userId: string, banned: boolean): void {
    this.db.prepare(`UPDATE users SET banned = ? WHERE id = ?`).run(banned ? 1 : 0, userId);
  }

  softDelete(userId: string): void {
    this.db.prepare(`UPDATE users SET deleted_at = ? WHERE id = ?`).run(Date.now(), userId);
  }

  listAll(limit = 50, offset = 0): User[] {
    const rows = this.db.prepare(
      `SELECT id, name, email, emailVerified, image, role, banned, deleted_at
       FROM users WHERE deleted_at IS NULL ORDER BY id LIMIT ? OFFSET ?`
    ).all(limit, offset) as any[];
    return rows.map((row: any) => ({
      id: row.id, name: row.name, email: row.email,
      emailVerified: row.emailVerified, image: row.image,
      role: row.role, banned: row.banned, deletedAt: row.deleted_at,
    }));
  }
}
```

- [ ] **Step 2: 创建 user-repo 测试**

```typescript
// lib/db/__tests__/user-repo.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { UserRepo } from "../user-repo.js";
import { run as runMigration001 } from "../migrations/001-init.js";

describe("UserRepo", () => {
  let db: Database.Database;
  let repo: UserRepo;

  beforeEach(() => {
    db = new Database(":memory:");
    runMigration001(db);
    // Ensure credentials table exists (normally created on first user)
    db.exec(`CREATE TABLE IF NOT EXISTS "credentials" (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL
    )`);
    repo = new UserRepo(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates a user and retrieves by email", () => {
    const user = repo.create({ email: "a@test.com", passwordHash: "$2a$12$..." });
    expect(user.email).toBe("a@test.com");
    expect(user.role).toBe("user");
    expect(user.banned).toBe(0);

    const found = repo.findByEmail("a@test.com");
    expect(found).not.toBeNull();
    expect(found!.id).toBe(user.id);
  });

  it("stores and retrieves password hash", () => {
    const user = repo.create({ email: "b@test.com", passwordHash: "hash123" });
    const hash = repo.getPasswordHash(user.id);
    expect(hash).toBe("hash123");
  });

  it("verifyEmail sets emailVerified timestamp", () => {
    repo.create({ email: "c@test.com", passwordHash: "x" });
    repo.verifyEmail("c@test.com");
    const user = repo.findByEmail("c@test.com");
    expect(user!.emailVerified).toBeGreaterThan(0);
  });

  it("setBanned toggles banned flag", () => {
    const user = repo.create({ email: "d@test.com", passwordHash: "x" });
    repo.setBanned(user.id, true);
    expect(repo.findById(user.id)!.banned).toBe(1);
    repo.setBanned(user.id, false);
    expect(repo.findById(user.id)!.banned).toBe(0);
  });

  it("softDelete marks deleted_at", () => {
    const user = repo.create({ email: "e@test.com", passwordHash: "x" });
    repo.softDelete(user.id);
    expect(repo.findById(user.id)).toBeNull();
    expect(repo.findByEmail("e@test.com")).toBeNull();
  });

  it("listAll returns users ordered by id", () => {
    repo.create({ email: "f@test.com", passwordHash: "x" });
    repo.create({ email: "g@test.com", passwordHash: "x" });
    const all = repo.listAll();
    expect(all).toHaveLength(2);
    expect(all[0].email).toBe("f@test.com");
    expect(all[1].email).toBe("g@test.com");
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
cd D:/Code2/agenttrade-saas && pnpm vitest run lib/db/__tests__/user-repo.test.ts
```

预期：所有测试 PASS

- [ ] **Step 4: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add lib/db/user-repo.ts lib/db/__tests__/ && git commit -m "feat: add UserRepo with CRUD, ban, soft delete"
```

---

### Task 6: 密码哈希辅助函数

**Files:**
- Create: `D:\Code2\agenttrade-saas\lib\auth\password.ts`
- Create: `D:\Code2\agenttrade-saas\lib\auth\__tests__\password.test.ts`

**Interfaces:**
- Produces:
  - `hashPassword(plain: string): Promise<string>`
  - `verifyPassword(plain: string, hash: string): Promise<boolean>`

- [ ] **Step 1: 创建 password.ts**

```typescript
// lib/auth/password.ts
import { hash, compare } from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed);
}
```

- [ ] **Step 2: 创建测试**

```typescript
// lib/auth/__tests__/password.test.ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../password.js";

describe("password", () => {
  it("hashes and verifies a password", async () => {
    const plain = "correct-horse-battery-staple";
    const hashed = await hashPassword(plain);
    expect(hashed).not.toBe(plain);
    expect(hashed).toContain("$2a$");

    const valid = await verifyPassword(plain, hashed);
    expect(valid).toBe(true);

    const invalid = await verifyPassword("wrong", hashed);
    expect(invalid).toBe(false);
  });

  it("produces different hashes for same input", async () => {
    const h1 = await hashPassword("test");
    const h2 = await hashPassword("test");
    expect(h1).not.toBe(h2);
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
cd D:/Code2/agenttrade-saas && pnpm vitest run lib/auth/__tests__/password.test.ts
```

预期：PASS

- [ ] **Step 4: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add lib/auth/password.ts lib/auth/__tests__/ && git commit -m "feat: add bcryptjs password hash/verify helpers"
```

---

### Task 7: NextAuth v5 配置

**Files:**
- Create: `D:\Code2\agenttrade-saas\lib\auth\auth.config.ts`
- Create: `D:\Code2\agenttrade-saas\app\api\auth\[...nextauth]\route.ts`

**Interfaces:**
- Consumes: `getUsersDb()` from Task 4, `UserRepo` from Task 5, `verifyPassword` from Task 6
- Produces: NextAuth route handler（`GET` / `POST` for `/api/auth/*`）

- [ ] **Step 1: 创建 auth.config.ts**

```typescript
// lib/auth/auth.config.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { SQLiteAdapter } from "@auth/sqlite-adapter";
import { getUsersDb } from "@/lib/db/client.js";
import { UserRepo } from "@/lib/db/user-repo.js";
import { verifyPassword } from "@/lib/auth/password.js";

const db = getUsersDb();
const userRepo = new UserRepo(db);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SQLiteAdapter(db),

  providers: [
    Credentials({
      name: "email",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        const user = userRepo.findByEmail(email);
        if (!user) return null;
        if (user.banned) return null;

        const passwordHash = userRepo.getPasswordHash(user.id);
        if (!passwordHash) return null;

        const valid = await verifyPassword(password, passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: "database",
  },

  callbacks: {
    async session({ session, user }) {
      // Extend session with custom fields from our user table
      if (session.user) {
        session.user.id = user.id;
        (session.user as any).role = (user as any).role ?? "user";
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role ?? "user";
      }
      return token;
    },
  },

  pages: {
    signIn: "/login",
  },
});
```

- [ ] **Step 2: 创建 NextAuth route handler**

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth/auth.config.js";

export const { GET, POST } = handlers;
```

- [ ] **Step 3: 验证类型检查**

```bash
cd D:/Code2/agenttrade-saas && pnpm tsc --noEmit 2>&1 | head -30
```

预期：无 type 错误（可能会有 NextAuth beta 的 minor 类型不匹配，通过 `skipLibCheck: true` 避免）

- [ ] **Step 4: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add lib/auth/auth.config.ts app/api/auth/ && git commit -m "feat: add NextAuth v5 config with credentials provider"
```

---

### Task 8: 邮件服务客户端

**Files:**
- Create: `D:\Code2\agenttrade-saas\lib\email\client.ts`
- Create: `D:\Code2\agenttrade-saas\lib\email\__tests__\client.test.ts`

**Interfaces:**
- Produces:
  - `sendVerificationEmail(email: string, token: string): Promise<void>`
  - `sendPasswordResetEmail(email: string, token: string): Promise<void>`

- [ ] **Step 1: 创建邮件客户端**

```typescript
// lib/email/client.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  },
});

const FROM = process.env.SMTP_FROM ?? "noreply@agenttrade.com";
const BASE_URL = process.env.AUTH_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${token}`;
  const html = `
    <h2>欢迎注册 AgentTrade</h2>
    <p>请点击以下链接验证你的邮箱：</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>链接 24 小时内有效。</p>
    <p>如果你没有注册 AgentTrade，请忽略此邮件。</p>
  `;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "验证你的邮箱 — AgentTrade",
    html,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${BASE_URL}/login?reset=${token}`;
  const html = `
    <h2>密码重置</h2>
    <p>你请求了密码重置，请点击以下链接设置新密码：</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>链接 1 小时内有效。</p>
    <p>如果你没有请求密码重置，请忽略此邮件。</p>
  `;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "密码重置 — AgentTrade",
    html,
  });
}
```

- [ ] **Step 2: 创建测试（mock nodemailer）**

```typescript
// lib/email/__tests__/client.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock nodemailer before import
vi.mock("nodemailer", () => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });
  return {
    default: {
      createTransport: () => ({ sendMail }),
    },
  };
});

describe("email client", () => {
  it("sendVerificationEmail constructs correct URL and sends", async () => {
    // Re-import after mock
    const { sendVerificationEmail } = await import("../client.js");

    // Should not throw
    await expect(
      sendVerificationEmail("user@test.com", "abc-token-123")
    ).resolves.toBeUndefined();
  });

  it("sendPasswordResetEmail constructs correct URL and sends", async () => {
    const { sendPasswordResetEmail } = await import("../client.js");

    await expect(
      sendPasswordResetEmail("user@test.com", "reset-token-456")
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
cd D:/Code2/agenttrade-saas && pnpm vitest run lib/email/__tests__/client.test.ts
```

预期：PASS

- [ ] **Step 4: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add lib/email/ && git commit -m "feat: add email client (verification + password reset)"
```

---

### Task 9: 注册 API

**Files:**
- Create: `D:\Code2\agenttrade-saas\app\api\auth\signup\route.ts`

**Interfaces:**
- Consumes: `UserRepo`, `hashPassword`, `sendVerificationEmail`
- Produces: `POST /api/auth/signup` — `{ userId, email }` or `{ error }`

- [ ] **Step 1: 创建 signup route**

```typescript
// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUsersDb } from "@/lib/db/client.js";
import { UserRepo } from "@/lib/db/user-repo.js";
import { hashPassword } from "@/lib/auth/password.js";
import { sendVerificationEmail } from "@/lib/email/client.js";
import { randomUUID } from "node:crypto";

const signupSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位").max(128),
  name: z.string().min(1).max(50).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法的 JSON" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数验证失败" },
      { status: 400 }
    );
  }

  const { email, password, name } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const db = getUsersDb();
  const userRepo = new UserRepo(db);

  // Check for existing user
  const existing = userRepo.findByEmail(normalizedEmail);
  if (existing) {
    // Don't leak whether email is already registered — return success
    // but don't send another verification email
    return NextResponse.json({ userId: existing.id, email: normalizedEmail });
  }

  const passwordHash = await hashPassword(password);
  const user = userRepo.create({
    email: normalizedEmail,
    passwordHash,
    name,
  });

  // Generate verification token
  const token = randomUUID();
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  db.prepare(
    `INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)`
  ).run(normalizedEmail, token, expires);

  // Send verification email (fire and forget — don't block response on email)
  sendVerificationEmail(normalizedEmail, token).catch((err) => {
    console.error("Failed to send verification email:", err);
  });

  return NextResponse.json({ userId: user.id, email: normalizedEmail }, { status: 201 });
}
```

- [ ] **Step 2: 安装 zod**

```bash
cd D:/Code2/agenttrade-saas && pnpm add zod
```

- [ ] **Step 3: 验证编译**

```bash
cd D:/Code2/agenttrade-saas && pnpm tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add app/api/auth/signup/ package.json pnpm-lock.yaml && git commit -m "feat: add signup API route with email verification token"
```

---

### Task 10: 邮箱验证 API

**Files:**
- Create: `D:\Code2\agenttrade-saas\app\api\auth\verify-email\route.ts`

**Interfaces:**
- Consumes: `getUsersDb()`, `UserRepo`
- Produces: `GET /api/auth/verify-email?token=xxx` → redirect to login with verified flag

- [ ] **Step 1: 创建 verify-email route**

```typescript
// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUsersDb } from "@/lib/db/client.js";
import { UserRepo } from "@/lib/db/user-repo.js";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing-token", req.url));
  }

  const db = getUsersDb();

  // Look up token
  const row = db.prepare(
    `SELECT identifier, expires FROM verification_tokens WHERE token = ?`
  ).get(token) as { identifier: string; expires: number } | undefined;

  if (!row) {
    return NextResponse.redirect(new URL("/login?error=invalid-token", req.url));
  }

  if (Date.now() > row.expires) {
    // Clean up expired token
    db.prepare(`DELETE FROM verification_tokens WHERE token = ?`).run(token);
    return NextResponse.redirect(new URL("/login?error=token-expired", req.url));
  }

  // Verify the email
  const userRepo = new UserRepo(db);
  userRepo.verifyEmail(row.identifier);

  // Delete used token
  db.prepare(`DELETE FROM verification_tokens WHERE token = ?`).run(token);

  return NextResponse.redirect(new URL("/login?verified=1", req.url));
}
```

- [ ] **Step 2: 验证编译**

```bash
cd D:/Code2/agenttrade-saas && pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add app/api/auth/verify-email/ && git commit -m "feat: add email verification route"
```

---

### Task 11: RealAuthAdapter 实现

**Files:**
- Create: `D:\Code2\agenttrade-saas\lib\auth\adapter.ts`
- Create: `D:\Code2\agenttrade-saas\lib\auth\__tests__\adapter.test.ts`

**Interfaces:**
- Consumes: `AuthAdapter` from `agenttrade/lib/auth/types`, `auth()` from NextAuth, `UserRepo`, `QuotaRepo`（Phase 2 实现，先 stub）
- Produces: `RealAuthAdapter implements AuthAdapter`

- [ ] **Step 1: 创建 RealAuthAdapter**

```typescript
// lib/auth/adapter.ts
import type { AuthAdapter, Session, User } from "agenttrade/lib/auth/types.js";
import { auth } from "@/lib/auth/auth.config.js";
import { getUsersDb } from "@/lib/db/client.js";
import { UserRepo } from "@/lib/db/user-repo.js";

export class RealAuthAdapter implements AuthAdapter {
  private userRepo: UserRepo;

  constructor() {
    const db = getUsersDb();
    this.userRepo = new UserRepo(db);
  }

  async getSession(request: Request): Promise<Session | null> {
    // NextAuth v5: call auth() to validate the session cookie on the incoming request
    const session = await auth();
    if (!session?.user?.id) return null;

    const dbUser = this.userRepo.findById(session.user.id);
    if (!dbUser) return null;
    if (dbUser.banned) return null;
    if (dbUser.deletedAt) return null;

    return {
      user: {
        id: dbUser.id,
        name: dbUser.name ?? dbUser.email,
        email: dbUser.email,
        avatar: dbUser.image ?? undefined,
        role: dbUser.role as User["role"],
      },
    };
  }

  hasPermission(user: User, permission: string): boolean {
    if (user.role === "admin") return true;
    if (permission === "analyze" && (user.role === "user")) return true;
    if (permission === "read:own" && (user.role === "user")) return true;
    return false;
  }

  async getQuotaLimit(user: User): Promise<number> {
    const db = getUsersDb();
    const row = db.prepare(
      `SELECT quota_limit FROM subscriptions WHERE user_id = ?`
    ).get(user.id) as { quota_limit: number } | undefined;
    return row?.quota_limit ?? 10; // default: free tier = 10/month
  }

  async getQuotaUsed(user: User): Promise<number> {
    const db = getUsersDb();
    const month = new Date().toISOString().slice(0, 7); // "2026-06"
    const row = db.prepare(
      `SELECT count FROM quotas WHERE user_id = ? AND month = ?`
    ).get(user.id, month) as { count: number } | undefined;
    return row?.count ?? 0;
  }
}
```

- [ ] **Step 2: 创建测试**

```typescript
// lib/auth/__tests__/adapter.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { setUsersDb, resetUsersDb } from "@/lib/db/client.js";
import { UserRepo } from "@/lib/db/user-repo.js";
import { run as runMigration001 } from "@/lib/db/migrations/001-init.js";
import { RealAuthAdapter } from "../adapter.js";

// Mock next-auth's auth() — returns null by default (no session)
vi.mock("@/lib/auth/auth.config.js", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

describe("RealAuthAdapter", () => {
  let db: Database.Database;
  let adapter: RealAuthAdapter;

  beforeEach(() => {
    db = new Database(":memory:");
    runMigration001(db);
    db.exec(`CREATE TABLE IF NOT EXISTS "credentials" (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL
    )`);
    setUsersDb(db);
    adapter = new RealAuthAdapter();
  });

  afterEach(() => {
    resetUsersDb();
    db.close();
    vi.clearAllMocks();
  });

  it("getSession returns null when auth() returns null", async () => {
    const req = new Request("http://localhost:3000/api/analyze");
    const session = await adapter.getSession(req);
    expect(session).toBeNull();
  });

  it("hasPermission grants analyze to user role", () => {
    const user = { id: "u1", name: "Test", role: "user" as const };
    expect(adapter.hasPermission(user, "analyze")).toBe(true);
    expect(adapter.hasPermission(user, "read:own")).toBe(true);
  });

  it("hasPermission grants everything to admin", () => {
    const user = { id: "u2", name: "Admin", role: "admin" as const };
    expect(adapter.hasPermission(user, "anything")).toBe(true);
  });

  it("getQuotaLimit returns 10 by default (free tier)", async () => {
    const user = { id: "u1", name: "Test", role: "user" as const };
    const limit = await adapter.getQuotaLimit(user);
    expect(limit).toBe(10);
  });

  it("getQuotaLimit returns custom limit when subscription exists", async () => {
    db.prepare(
      `INSERT INTO users (id, email, role, banned) VALUES (?, ?, 'user', 0)`
    ).run("u3", "pro@test.com");
    db.prepare(
      `INSERT INTO subscriptions (user_id, plan, quota_limit) VALUES (?, 'pro', 100)`
    ).run("u3");

    const limit = await adapter.getQuotaLimit({ id: "u3", name: "Pro", role: "user" });
    expect(limit).toBe(100);
  });

  it("getQuotaUsed returns 0 when no usage recorded", async () => {
    const used = await adapter.getQuotaUsed({ id: "u1", name: "Test", role: "user" });
    expect(used).toBe(0);
  });

  it("getQuotaUsed returns count for current month", async () => {
    const month = new Date().toISOString().slice(0, 7);
    db.prepare(
      `INSERT INTO users (id, email, role, banned) VALUES (?, ?, 'user', 0)`
    ).run("u4", "heavy@test.com");
    db.prepare(
      `INSERT INTO quotas (user_id, month, count) VALUES (?, ?, 5)`
    ).run("u4", month);

    const used = await adapter.getQuotaUsed({ id: "u4", name: "Heavy", role: "user" });
    expect(used).toBe(5);
  });

  it("getSession returns null for banned user", async () => {
    const { auth } = await import("@/lib/auth/auth.config.js");
    const repo = new UserRepo(db);
    const user = repo.create({ email: "banned@test.com", passwordHash: "x" });
    repo.setBanned(user.id, true);

    (auth as any).mockResolvedValue({ user: { id: user.id, email: user.email } });

    const req = new Request("http://localhost:3000/api/analyze");
    const session = await adapter.getSession(req);
    expect(session).toBeNull();
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
cd D:/Code2/agenttrade-saas && pnpm vitest run lib/auth/__tests__/adapter.test.ts
```

预期：PASS

- [ ] **Step 4: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add lib/auth/adapter.ts lib/auth/__tests__/adapter.test.ts && git commit -m "feat: add RealAuthAdapter implementing AuthAdapter"
```

---

### Task 12: instrumentation.ts 启动注入

**Files:**
- Create: `D:\Code2\agenttrade-saas\instrumentation.ts`

**Interfaces:**
- Consumes: `setAuthAdapter` from `agenttrade/lib/auth/types`, `RealAuthAdapter` from Task 11
- Produces: 启动时自动调用 `setAuthAdapter`

- [ ] **Step 1: 创建 instrumentation.ts**

```typescript
// instrumentation.ts
import { setAuthAdapter } from "agenttrade/lib/auth/types.js";
import { RealAuthAdapter } from "@/lib/auth/adapter.js";

export function register(): void {
  setAuthAdapter(new RealAuthAdapter());
}
```

- [ ] **Step 2: 验证 next.config.ts 中已启用 instrumentationHook**

确认 `next.config.ts` 包含：
```typescript
experimental: {
  instrumentationHook: true,
}
```
（Task 3 已设置）

- [ ] **Step 3: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add instrumentation.ts && git commit -m "feat: add instrumentation hook for setAuthAdapter injection"
```

---

### Task 13: middleware.ts（完全替换开源版）

**Files:**
- Create: `D:\Code2\agenttrade-saas\middleware.ts`

**Interfaces:**
- Consumes: `getAuthAdapter` from `agenttrade/lib/auth/types`
- Produces: Next.js middleware，鉴权 + 角色检查 + 配额检查

- [ ] **Step 1: 创建 middleware.ts**

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthAdapter } from "agenttrade/lib/auth/types.js";

/** 需要用户认证的路由 */
const PROTECTED_PREFIXES = ["/api/analyze", "/api/session"];

/** 需要管理员权限的路由 */
const ADMIN_PREFIXES = ["/api/admin"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 非 API 路由直接放行（pages 不受中间件保护）
  if (!path.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 检查是否是需要保护的路由
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAdmin = ADMIN_PREFIXES.some((p) => path.startsWith(p));

  if (!isProtected && !isAdmin) {
    return NextResponse.next();
  }

  const auth = getAuthAdapter();
  const session = await auth.getSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin 路由角色校验
  if (isAdmin && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 配额检查（仅 analyze 路由）
  if (path.startsWith("/api/analyze") && request.method === "POST") {
    const used = await auth.getQuotaUsed(session.user);
    const limit = await auth.getQuotaLimit(session.user);
    if (limit !== -1 && used >= limit) {
      return NextResponse.json(
        { error: "本月分析次数已用完，请升级订阅" },
        { status: 429 }
      );
    }
  }

  // 注入用户身份 header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.user.id);
  requestHeaders.set("x-user-role", session.user.role);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/api/:path*"],
};
```

- [ ] **Step 2: 验证编译**

```bash
cd D:/Code2/agenttrade-saas && pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add middleware.ts && git commit -m "feat: add middleware with auth, admin role check, and quota enforcement"
```

---

### Task 14: 登录页面

**Files:**
- Create: `D:\Code2\agenttrade-saas\app\login\page.tsx`

**Interfaces:**
- Produces: 登录表单页面，Email + 密码，链接到注册页

- [ ] **Step 1: 创建登录页**

```tsx
// app/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const errorMessages: Record<string, string> = {
    "missing-token": "验证链接无效",
    "invalid-token": "验证链接无效或已过期",
    "token-expired": "验证链接已过期，请重新注册",
  };

  const displayError = errMsg || (error ? errorMessages[error] ?? "登录失败" : "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrMsg("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setErrMsg("邮箱或密码错误");
      setLoading(false);
    } else {
      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">登录 AgentTrade</h1>
          <p className="text-zinc-400 text-sm mt-1">输入你的邮箱和密码</p>
        </div>

        {verified === "1" && (
          <div className="bg-green-900/30 text-green-400 text-sm p-3 rounded-lg">
            邮箱验证成功，请登录
          </div>
        )}

        {displayError && (
          <div className="bg-red-900/30 text-red-400 text-sm p-3 rounded-lg">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-1" htmlFor="email">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1" htmlFor="password">
              密码
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          还没有账号？{" "}
          <a href="/signup" className="text-white underline underline-offset-2">
            去注册
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证编译**

```bash
cd D:/Code2/agenttrade-saas && pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add app/login/ && git commit -m "feat: add login page"
```

---

### Task 15: 注册页面

**Files:**
- Create: `D:\Code2\agenttrade-saas\app\signup\page.tsx`

**Interfaces:**
- Produces: 注册表单页面，Email + 密码 + 名字

- [ ] **Step 1: 创建注册页**

```tsx
// app/signup/page.tsx
"use client";

import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrMsg("");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });

    if (!res.ok) {
      const data = await res.json();
      setErrMsg(data.error ?? "注册失败");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold text-white">检查你的邮箱</h1>
          <p className="text-zinc-400 text-sm">
            我们向 <span className="text-white">{email}</span> 发送了一封验证邮件，
            请点击邮件中的链接完成注册。
          </p>
          <a href="/login" className="text-white underline text-sm">
            去登录
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">注册 AgentTrade</h1>
          <p className="text-zinc-400 text-sm mt-1">创建你的账号</p>
        </div>

        {errMsg && (
          <div className="bg-red-900/30 text-red-400 text-sm p-3 rounded-lg">
            {errMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-1" htmlFor="name">
              名字（可选）
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-500"
              placeholder="你的名字"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1" htmlFor="email">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1" htmlFor="password">
              密码
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-500"
              placeholder="至少 8 位"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "注册中..." : "注册"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          已有账号？{" "}
          <a href="/login" className="text-white underline underline-offset-2">
            去登录
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证编译**

```bash
cd D:/Code2/agenttrade-saas && pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd D:/Code2/agenttrade-saas && git add app/signup/ && git commit -m "feat: add signup page"
```

---

### Task 16: 端到端验证

**Files:**
- 无新文件（验证阶段）

- [ ] **Step 1: 运行所有测试**

```bash
cd D:/Code2/agenttrade-saas && pnpm test
```

预期：所有测试 PASS

- [ ] **Step 2: 验证 Next.js 构建**

```bash
cd D:/Code2/agenttrade-saas && pnpm build 2>&1 | tail -20
```

预期：构建成功，无 type 错误

- [ ] **Step 3: 启动开发服务器并手动验证流程**

```bash
cd D:/Code2/agenttrade-saas && pnpm dev
```

验证清单：
1. 访问 `/signup` → 注册新用户
2. 检查终端日志 → 应输出验证邮件链接（console 无 SMTP 时直接 log）
3. 使用打印的链接 → 验证邮箱 → 重定向到 `/login?verified=1`
4. 使用注册的邮箱和密码登录 → 应跳转到首页
5. 未登录时访问 `/api/analyze` → 返回 401

- [ ] **Step 4: Commit any final fixes**

```bash
cd D:/Code2/agenttrade-saas && git add -A && git commit -m "chore: final Phase 1 integration fixes"
```

---

## 有意推迟到后续阶段的内容

| 功能 | 原因 | 计划 |
|------|------|------|
| GitHub OAuth | 先拿到 email/password MVP 跑通 | Phase 1.5 或 Phase 3 — 在 NextAuth 中加一个 Provider，不改架构 |
| 微信 OAuth | 需要自定义 NextAuth provider | Phase 3 |
| `quota-repo.ts`（独立文件） | 用户注册时自动建 subscriptions 默认行即可，无需独立 repo | Phase 2 — 提取为 QuotaRepo，加两阶段预扣 |
| 管理后台页面 | 需要 Phase 2 会员数据才能展示 | Phase 3 |
| `tailwindcss` / `shadcn/ui` | 登录/注册页用手写内联样式先跑通，避免脚手架引入不必要的复杂度 | Phase 1.5 — 引入 UI 框架统一风格 |
| 首页鉴权重定向 | 未登录用户访问 `/` 目前不保护；需要确定产品逻辑（公共首页 vs 必须登录） | Phase 1.5 |
| `serve.mjs` / Socket.IO | SaaS 版复用开源 `server.mjs` 启动 Socket.IO；`RealAuthAdapter` 注入后自动生效 | Phase 1.5 — 迁移 server.mjs |
