// components/wishpool/__tests__/WishCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WishCard } from "../WishCard.js";
import type { WishWithMeta } from "@/lib/wishpool/types.js";

const mockWish: WishWithMeta = {
  id: "test-1",
  title: "暗夜模式",
  body: "需要夜间主题",
  status: "open",
  pinned: 1,
  author_id: "u1",
  author_name: "Alice",
  created_at: Math.floor(Date.now() / 1000) - 3600,
  updated_at: Math.floor(Date.now() / 1000),
  tags: ["体验优化"],
  reactions: [{ emoji: "👍", count: 3, reacted: false }, { emoji: "👎", count: 0, reacted: false }, { emoji: "😄", count: 0, reacted: false }, { emoji: "🎉", count: 0, reacted: false }, { emoji: "😕", count: 0, reacted: false }, { emoji: "❤️", count: 1, reacted: false }],
  comment_count: 5,
};

describe("WishCard", () => {
  it("renders title, status label, author, pin marker", () => {
    render(<WishCard wish={mockWish} />);
    expect(screen.getByText("暗夜模式")).toBeDefined();
    expect(screen.getByText("待处理")).toBeDefined();
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("📌")).toBeDefined();
  });

  it("links to the detail page", () => {
    render(<WishCard wish={mockWish} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/wishpool/test-1");
  });
});
