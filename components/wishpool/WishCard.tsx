// components/wishpool/WishCard.tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge.js";
import { formatRelativeTime } from "@/lib/utils.js";
import { statusLabel, statusColor } from "@/lib/wishpool/utils.js";
import type { WishWithMeta } from "@/lib/wishpool/types.js";

export function WishCard({ wish }: { wish: WishWithMeta }) {
  return (
    <Link
      href={`/wishpool/${wish.id}`}
      className="block rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/50 transition-colors p-5 space-y-3"
    >
      {/* Top row: title + pinned */}
      <div className="flex items-start gap-2">
        {wish.pinned === 1 && (
          <span className="text-amber-400 text-sm shrink-0 mt-0.5">📌</span>
        )}
        <h3 className="text-sm font-medium text-zinc-200 leading-snug line-clamp-2">
          {wish.title}
        </h3>
      </div>

      {/* Middle: tags + status */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusColor(wish.status)}`}>
          {statusLabel(wish.status)}
        </span>
        {wish.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Bottom: meta */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span>{wish.author_name}</span>
        <span>{formatRelativeTime(wish.created_at)}</span>
        <span className="flex items-center gap-1">
          👍 {wish.reactions.find((r) => r.emoji === "👍")?.count ?? 0}
        </span>
        <span>💬 {wish.comment_count}</span>
      </div>
    </Link>
  );
}
