"use client";
import { useEffect, useState } from "react";
import { QuoteCard } from "./QuoteCard.js";
import { IndicatorList } from "./IndicatorList.js";
import { AgentSummary } from "./AgentSummary.js";
import { KlineChart } from "./KlineChart.js";
import type { AgentConclusion } from "./types.js";
import type { KlineBar } from "@/lib/data-sdk/types.js";

type Period = "daily" | "weekly" | "monthly";

interface DataPanelProps {
  code: string;
  name?: string | null;
  agentConclusions: AgentConclusion[];
}

const PERIOD_LABELS: Record<Period, string> = {
  daily: "日K",
  weekly: "周K",
  monthly: "月K",
};

const PERIODS: Period[] = ["daily", "weekly", "monthly"];

export function DataPanel({ code, name, agentConclusions }: DataPanelProps) {
  const [klineBars, setKlineBars] = useState<KlineBar[]>([]);
  const [period, setPeriod] = useState<Period>("daily");
  const [klineLoading, setKlineLoading] = useState(true);
  const [klineError, setKlineError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setKlineLoading(true);

    async function fetchKline() {
      try {
        const res = await fetch(
          `/api/quote/${encodeURIComponent(code)}?count=120&period=${period}`
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (!cancelled) {
          setKlineBars(data.bars ?? []);
          setKlineError(false);
        }
      } catch {
        if (!cancelled) setKlineError(true);
      } finally {
        if (!cancelled) setKlineLoading(false);
      }
    }

    fetchKline();

    return () => {
      cancelled = true;
    };
  }, [code, period]);

  return (
    <div className="w-full flex flex-col gap-4 p-4 h-full overflow-y-auto">
      <QuoteCard code={code} name={name ?? undefined} />

      {/* Period tabs + KlineChart */}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {klineLoading && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 h-[380px] animate-pulse flex items-center justify-center">
            <span className="text-xs text-zinc-500">加载中</span>
          </div>
        )}

        {klineError && !klineLoading && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 h-[380px] flex items-center justify-center">
            <p className="text-xs text-zinc-600">K线数据暂不可用</p>
          </div>
        )}

        {!klineLoading && !klineError && (
          <KlineChart bars={klineBars} period={period} />
        )}
      </div>

      <IndicatorList indicators={null} />
      <AgentSummary agents={agentConclusions} />
    </div>
  );
}
