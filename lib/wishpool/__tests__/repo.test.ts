// lib/wishpool/__tests__/repo.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import { getDb, setDb, resetDb } from "@/lib/db/client.js";
import {
  createWish,
  getWish,
  listWishes,
  updateWish,
  deleteWish,
  getUsedTags,
} from "../repo.js";
import type { CreateWishInput, WishWithMeta } from "../types.js";

let db: Database.Database;

beforeAll(() => {
  db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  // Recreate tables in memory
  db.exec(`
    CREATE TABLE IF NOT EXISTS wishes (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open', pinned INTEGER NOT NULL DEFAULT 0,
      author_id TEXT NOT NULL DEFAULT 'anonymous', author_name TEXT NOT NULL DEFAULT '匿名用户',
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS wish_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT, wish_id TEXT NOT NULL REFERENCES wishes(id) ON DELETE CASCADE,
      tag TEXT NOT NULL, UNIQUE(wish_id, tag)
    );
    CREATE TABLE IF NOT EXISTS wish_reactions (
      wish_id TEXT NOT NULL REFERENCES wishes(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL DEFAULT 'anonymous', emoji TEXT NOT NULL,
      PRIMARY KEY (wish_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS wish_comments (
      id TEXT PRIMARY KEY, wish_id TEXT NOT NULL REFERENCES wishes(id) ON DELETE CASCADE,
      parent_id TEXT, author_id TEXT NOT NULL DEFAULT 'anonymous',
      author_name TEXT NOT NULL DEFAULT '匿名用户', body TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);
  setDb(db);
});

afterAll(() => {
  resetDb();
});

describe("createWish", () => {
  it("creates a wish with tags and returns WishWithMeta", () => {
    const input: CreateWishInput = {
      title: "暗夜模式支持",
      body: "需要夜间主题",
      tags: ["体验优化"],
    };
    const result = createWish("user-1", "Alice", input);
    expect(result.title).toBe("暗夜模式支持");
    expect(result.status).toBe("open");
    expect(result.tags).toContain("体验优化");
    expect(result.comment_count).toBe(0);
    expect(result.id).toBeTruthy();
  });
});

describe("getWish", () => {
  it("returns null for missing wish", () => {
    expect(getWish("nonexistent", "anonymous")).toBeNull();
  });

  it("returns WishWithMeta with reaction flags for the requesting user", () => {
    const created = createWish("user-1", "Bob", {
      title: "测试",
      body: "",
      tags: [],
    });
    const result = getWish(created.id, "viewer-1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe(created.id);
  });
});

describe("listWishes", () => {
  it("returns paginated results with total count", () => {
    // Seed 3 wishes
    for (let i = 1; i <= 3; i++) {
      createWish("user-1", "Tester", { title: `Wish ${i}`, body: "", tags: [] });
    }
    const page = listWishes({ sort: "latest", page: 0 }, "anonymous");
    expect(page.items.length).toBeGreaterThanOrEqual(3);
    expect(page.total).toBeGreaterThanOrEqual(3);
    expect(page.page).toBe(0);
  });

  it("filters by status", () => {
    const page = listWishes({ status: "open", sort: "latest", page: 0 }, "anonymous");
    expect(page.items.every((w) => w.status === "open")).toBe(true);
  });

  it("filters by tag", () => {
    createWish("user-1", "T", { title: "Tagged wish", body: "", tags: ["数据相关"] });
    const page = listWishes({ tag: "数据相关", sort: "latest", page: 0 }, "anonymous");
    expect(page.items.length).toBeGreaterThanOrEqual(1);
    expect(page.items.some((w) => w.tags.includes("数据相关"))).toBe(true);
  });

  it("searches by keyword", () => {
    createWish("user-1", "T", { title: "独一无二关键词测试", body: "", tags: [] });
    const page = listWishes({ q: "独一无二关键词测试", sort: "latest", page: 0 }, "anonymous");
    expect(page.items.length).toBe(1);
  });

  it("puts pinned items first", () => {
    const w = createWish("user-1", "T", { title: "Pinned item", body: "", tags: [] });
    updateWish(w.id, "admin", "admin", { pinned: true });
    const page = listWishes({ sort: "latest", page: 0 }, "anonymous");
    if (page.items.length > 1) {
      expect(page.items[0].pinned).toBe(1);
    }
  });
});

describe("updateWish", () => {
  it("updates status and tags", () => {
    const created = createWish("user-1", "X", { title: "Old", body: "", tags: ["功能请求"] });
    const updated = updateWish(created.id, "user-1", "user", {
      status: "in_progress",
      tags: ["功能请求", "数据相关"],
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("in_progress");
    expect(updated!.tags).toEqual(expect.arrayContaining(["功能请求", "数据相关"]));
  });

  it("rejects non-author non-admin edits", () => {
    const created = createWish("user-1", "X", { title: "Mine", body: "", tags: [] });
    const result = updateWish(created.id, "user-2", "user", { status: "done" });
    expect(result).toBeNull();
  });

  it("allows admin to edit anyone's wish", () => {
    const created = createWish("user-1", "X", { title: "User wish", body: "", tags: [] });
    const result = updateWish(created.id, "admin-1", "admin", { status: "done" });
    expect(result).not.toBeNull();
    expect(result!.status).toBe("done");
  });
});

describe("getUsedTags", () => {
  it("returns distinct tags in use", () => {
    createWish("u", "A", { title: "T1", body: "", tags: ["Bug修复"] });
    createWish("u", "A", { title: "T2", body: "", tags: ["Bug修复", "体验优化"] });
    const tags = getUsedTags();
    expect(tags).toContain("Bug修复");
    expect(tags).toContain("体验优化");
  });
});
