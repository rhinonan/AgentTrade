// lib/wishpool/repo.ts
import { getDb } from "@/lib/db/client.js";
import type {
  Wish,
  WishWithMeta,
  WishFilters,
  CreateWishInput,
  UpdateWishInput,
  ReactionCount,
  ReactionEmoji,
  WishTagRow,
  CommentTree,
  WishCommentRow,
} from "./types.js";
import { REACTION_EMOJIS } from "./types.js";

const PAGE_SIZE = 20;

// ── Wishes CRUD ────────────────────────────────────────

export function createWish(
  authorId: string,
  authorName: string,
  input: CreateWishInput,
): WishWithMeta {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  const insertWish = db.prepare(`
    INSERT INTO wishes (id, title, body, author_id, author_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTag = db.prepare(`
    INSERT OR IGNORE INTO wish_tags (wish_id, tag) VALUES (?, ?)
  `);

  const txn = db.transaction(() => {
    insertWish.run(id, input.title, input.body, authorId, authorName, now, now);
    for (const tag of input.tags) {
      insertTag.run(id, tag);
    }
  });
  txn();

  return getWish(id, authorId)!;
}

export function getWish(id: string, viewerId: string): WishWithMeta | null {
  const db = getDb();
  const wish = db.prepare("SELECT * FROM wishes WHERE id = ?").get(id) as Wish | undefined;
  if (!wish) return null;

  const tags = (
    db.prepare("SELECT tag FROM wish_tags WHERE wish_id = ?").all(id) as WishTagRow[]
  ).map((r) => r.tag);

  const reactionRows = db
    .prepare(
      "SELECT emoji, COUNT(*) as count FROM wish_reactions WHERE wish_id = ? GROUP BY emoji",
    )
    .all(id) as { emoji: ReactionEmoji; count: number }[];

  const userEmoji = (
    db
      .prepare("SELECT emoji FROM wish_reactions WHERE wish_id = ? AND user_id = ?")
      .get(id, viewerId) as { emoji: ReactionEmoji } | undefined
  )?.emoji ?? null;

  const reactions: ReactionCount[] = REACTION_EMOJIS.map((emoji) => {
    const row = reactionRows.find((r) => r.emoji === emoji);
    return {
      emoji,
      count: row ? row.count : 0,
      reacted: userEmoji === emoji,
    };
  });

  const { count: comment_count } = db
    .prepare("SELECT COUNT(*) as count FROM wish_comments WHERE wish_id = ?")
    .get(id) as { count: number };

  return { ...wish, tags, reactions, comment_count };
}

export function listWishes(
  filters: WishFilters,
  viewerId: string,
): { items: WishWithMeta[]; total: number; page: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.status) {
    conditions.push("w.status = ?");
    params.push(filters.status);
  }
  if (filters.q) {
    conditions.push("w.title LIKE ?");
    params.push(`%${filters.q}%`);
  }
  if (filters.tag) {
    conditions.push(
      "EXISTS (SELECT 1 FROM wish_tags wt WHERE wt.wish_id = w.id AND wt.tag = ?)",
    );
    params.push(filters.tag);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy: string;
  switch (filters.sort) {
    case "popular":
      orderBy =
        "ORDER BY w.pinned DESC, (SELECT COUNT(*) FROM wish_reactions wr WHERE wr.wish_id = w.id) DESC, w.created_at DESC";
      break;
    case "updated":
      orderBy = "ORDER BY w.pinned DESC, w.updated_at DESC";
      break;
    default:
      orderBy = "ORDER BY w.pinned DESC, w.created_at DESC";
  }

  const { total } = db
    .prepare(`SELECT COUNT(*) as total FROM wishes w ${where}`)
    .get(...params) as { total: number };

  const offset = filters.page * PAGE_SIZE;
  const rows = db
    .prepare(
      `SELECT w.* FROM wishes w ${where} ${orderBy} LIMIT ? OFFSET ?`,
    )
    .all(...params, PAGE_SIZE, offset) as Wish[];

  // Batch-load tags for all rows
  const tagRows = db
    .prepare(
      `SELECT wish_id, tag FROM wish_tags WHERE wish_id IN (${rows.map(() => "?").join(",")})`,
    )
    .all(...rows.map((r) => r.id)) as WishTagRow[];

  const tagsByWish = new Map<string, string[]>();
  for (const tr of tagRows) {
    const arr = tagsByWish.get(tr.wish_id) ?? [];
    arr.push(tr.tag);
    tagsByWish.set(tr.wish_id, arr);
  }

  const items: WishWithMeta[] = rows.map((w) => {
    const tags = tagsByWish.get(w.id) ?? [];
    const { count: comment_count } = db
      .prepare("SELECT COUNT(*) as count FROM wish_comments WHERE wish_id = ?")
      .get(w.id) as { count: number };
    // Reactions summary — aggregated
    const reactionRows = db
      .prepare(
        "SELECT emoji, COUNT(*) as count FROM wish_reactions WHERE wish_id = ? GROUP BY emoji",
      )
      .all(w.id) as { emoji: ReactionEmoji; count: number }[];
    const userEmoji = (
      db
        .prepare("SELECT emoji FROM wish_reactions WHERE wish_id = ? AND user_id = ?")
        .get(w.id, viewerId) as { emoji: ReactionEmoji } | undefined
    )?.emoji ?? null;
    const reactions: ReactionCount[] = REACTION_EMOJIS.map((emoji) => {
      const row = reactionRows.find((r) => r.emoji === emoji);
      return { emoji, count: row ? row.count : 0, reacted: userEmoji === emoji };
    });
    return { ...w, tags, reactions, comment_count };
  });

  return { items, total, page: filters.page };
}

export function updateWish(
  id: string,
  userId: string,
  userRole: string,
  input: UpdateWishInput,
): WishWithMeta | null {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM wishes WHERE id = ?").get(id) as Wish | undefined;
  if (!existing) return null;

  // Permission check: author or admin
  if (existing.author_id !== userId && userRole !== "admin") return null;

  // Non-admin cannot toggle pinned
  const pinned =
    input.pinned !== undefined
      ? userRole === "admin"
        ? input.pinned
          ? 1
          : 0
        : existing.pinned
      : existing.pinned;

  const txn = db.transaction(() => {
    const sets: string[] = [];
    const params: (string | number)[] = [];

    if (input.title !== undefined) {
      sets.push("title = ?");
      params.push(input.title);
    }
    if (input.body !== undefined) {
      sets.push("body = ?");
      params.push(input.body);
    }
    if (input.status !== undefined) {
      sets.push("status = ?");
      params.push(input.status);
    }
    if (input.pinned !== undefined && userRole === "admin") {
      sets.push("pinned = ?");
      params.push(pinned);
    }
    sets.push("updated_at = ?");
    params.push(Math.floor(Date.now() / 1000));

    if (sets.length > 1) {
      params.push(id);
      db.prepare(`UPDATE wishes SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    }

    // Replace tags if provided
    if (input.tags !== undefined) {
      db.prepare("DELETE FROM wish_tags WHERE wish_id = ?").run(id);
      const insertTag = db.prepare("INSERT OR IGNORE INTO wish_tags (wish_id, tag) VALUES (?, ?)");
      for (const tag of input.tags) {
        insertTag.run(id, tag);
      }
    }
  });
  txn();

  return getWish(id, userId);
}

export function deleteWish(
  id: string,
  userId: string,
  userRole: string,
): boolean {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM wishes WHERE id = ?").get(id) as Wish | undefined;
  if (!existing) return false;
  if (existing.author_id !== userId && userRole !== "admin") return false;
  db.prepare("DELETE FROM wishes WHERE id = ?").run(id);
  return true;
}

// ── Tags ─────────────────────────────────────────────────

export function getUsedTags(): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT DISTINCT tag FROM wish_tags ORDER BY tag")
    .all() as WishTagRow[];
  return rows.map((r) => r.tag);
}

// ── Comments ────────────────────────────────────────────

export function createComment(
  wishId: string,
  authorId: string,
  authorName: string,
  body: string,
  parentId: string | null,
): WishCommentRow {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  db.prepare(`
    INSERT INTO wish_comments (id, wish_id, parent_id, author_id, author_name, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, wishId, parentId, authorId, authorName, body, now);

  // Touch wish updated_at
  db.prepare("UPDATE wishes SET updated_at = ? WHERE id = ?").run(now, wishId);

  return db.prepare("SELECT * FROM wish_comments WHERE id = ?").get(id) as WishCommentRow;
}

export function getComments(wishId: string): CommentTree[] {
  const db = getDb();
  const all = db
    .prepare("SELECT * FROM wish_comments WHERE wish_id = ? ORDER BY created_at ASC")
    .all(wishId) as WishCommentRow[];

  // Build tree: top-level + one level of replies
  const topLevel = all.filter((c) => c.parent_id === null);
  const replies = all.filter((c) => c.parent_id !== null);

  return topLevel.map((c) => ({
    ...c,
    replies: replies.filter((r) => r.parent_id === c.id),
  }));
}

export function deleteComment(
  commentId: string,
  userId: string,
  userRole: string,
): boolean {
  const db = getDb();
  const comment = db
    .prepare("SELECT * FROM wish_comments WHERE id = ?")
    .get(commentId) as WishCommentRow | undefined;
  if (!comment) return false;
  if (comment.author_id !== userId && userRole !== "admin") return false;

  db.prepare("DELETE FROM wish_comments WHERE id = ?").run(commentId);
  return true;
}

// ── Reactions ───────────────────────────────────────────

export function setReaction(
  wishId: string,
  userId: string,
  emoji: ReactionEmoji,
): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO wish_reactions (wish_id, user_id, emoji) VALUES (?, ?, ?)
  `).run(wishId, userId, emoji);
}

export function removeReaction(wishId: string, userId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM wish_reactions WHERE wish_id = ? AND user_id = ?").run(
    wishId,
    userId,
  );
}
