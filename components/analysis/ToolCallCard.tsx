"use client";
import { useState } from "react";

const TOOL_ICONS: Record<string, string> = {
  get_kline: "📊",
  get_kline_technicals: "📊",
  calc_indicators: "📈",
  calc_rsi: "📈",
  calc_macd: "📈",
  get_fund_flow: "💰",
  get_news: "📰",
  get_financials: "📋",
  search_web: "🌐",
  default: "🔧",
};

export interface ToolCallCardProps {
  tool: string;
  args: Record<string, unknown>;
  result?: string;
  ts: number;
  isError?: boolean;
  collapsed?: boolean;
}

function formatArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args).slice(0, 3);
  return entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ");
}

function formatResultPreview(result: string): string {
  if (result.length <= 100) return result;
  return result.slice(0, 100) + "…";
}

export function ToolCallCard({
  tool,
  args,
  result,
  ts,
  isError = false,
  collapsed = false,
}: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(!collapsed);
  const [showFullResult, setShowFullResult] = useState(false);
  const icon = TOOL_ICONS[tool] ?? TOOL_ICONS.default;

  return (
    <div
      className={`text-xs py-1.5 px-3 border-l-2 ${
        isError
          ? "border-l-red-500 bg-red-950/10"
          : result
            ? "border-l-emerald-600 bg-emerald-950/5"
            : "border-l-amber-500 bg-amber-950/5"
      }`}
    >
      <button
        type="button"
        className="flex items-center gap-1.5 w-full text-left cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-zinc-400">
          {expanded ? "▼" : "▶"}
        </span>
        <span className="mr-1">{icon}</span>
        <span className="text-zinc-300 font-medium">{tool}</span>
        <span className="text-zinc-600">
          ({formatArgs(args)})
        </span>
        {!result && !isError && (
          <span className="ml-auto text-amber-500 animate-pulse text-[10px]">
            running…
          </span>
        )}
        {isError && (
          <span className="ml-auto text-red-400 text-[10px]">failed</span>
        )}
      </button>

      {expanded && result && (
        <div className="mt-1 ml-5 relative group">
          <p
            className={`text-zinc-500 leading-relaxed ${isError ? "text-red-400" : ""}`}
            onMouseEnter={() => setShowFullResult(true)}
            onMouseLeave={() => setShowFullResult(false)}
          >
            {formatResultPreview(result)}
          </p>
          {/* Hover tooltip with full JSON */}
          {showFullResult && result.length > 100 && (
            <div className="absolute left-0 bottom-full mb-1 z-50 max-w-md p-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl">
              <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                {result}
              </pre>
            </div>
          )}
        </div>
      )}
      {expanded && !result && !isError && (
        <p className="mt-1 ml-5 text-zinc-600 italic">等待结果…</p>
      )}
    </div>
  );
}
