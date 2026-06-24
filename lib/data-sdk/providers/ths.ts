// lib/data-sdk/providers/ths.ts
// 同花顺 (10jqka.com.cn) — hot stocks, north-bound capital, consensus EPS.
// Priority 2 data source — low risk, no rate limit needed.

import type { DataResult, HotStock, NorthBoundFlow, ConsensusEPS } from "../types.js";
import { normalizeCode, fetchWithTimeout } from "../utils.js";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
const THS_BASE = "https://basic.10jqka.com.cn";

interface RawHotStockItem { code?: string; stockCode?: string; name?: string; stockName?: string; reason?: string; theme?: string; changePct?: number; rise?: number; limitUpTimes?: number; boardNum?: number; }
interface RawNorthBoundItem { time?: string; minute?: string; hgtBuy?: number; shBuy?: number; hgtSell?: number; shSell?: number; sgtBuy?: number; szBuy?: number; sgtSell?: number; szSell?: number; }

export class THSProvider {
  private timeout: number;

  constructor(timeout: number = 15_000) {
    this.timeout = timeout;
  }

  /** Get today's hot stocks with theme attribution. */
  async getHotStocks(): Promise<DataResult<HotStock[]>> {
    const url = `${THS_BASE}/api/stockph/hotstock/rank`;
    try {
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } }, this.timeout);
      if (!res.ok) return { data: null, error: `HTTP ${res.status}`, source: "ths" };

      const d = await res.json();
      const list = d?.data ?? d?.result ?? [];
      const items: HotStock[] = (Array.isArray(list) ? list : []).map((s: RawHotStockItem) => ({
        symbol: normalizeCode(s.code ?? s.stockCode ?? ""),
        name: s.name ?? s.stockName ?? "",
        reason: s.reason ?? s.theme ?? "",
        changePct: s.changePct ?? s.rise ?? 0,
        limitUpTimes: s.limitUpTimes ?? s.boardNum ?? 0,
      }));
      return { data: items, source: "ths" };
    } catch (err) {
      return { data: null, error: String(err), source: "ths" };
    }
  }

  /** Get north-bound capital flow (minute-level). */
  async getNorthBound(): Promise<DataResult<NorthBoundFlow[]>> {
    const url = `${THS_BASE}/api/stockph/northbound/flow`;
    try {
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } }, this.timeout);
      if (!res.ok) return { data: null, error: `HTTP ${res.status}`, source: "ths" };

      const d = await res.json();
      const list = d?.data ?? d?.result ?? [];
      const items: NorthBoundFlow[] = (Array.isArray(list) ? list : []).map((f: RawNorthBoundItem) => {
        const hgtBuy = f.hgtBuy ?? f.shBuy ?? 0;
        const hgtSell = f.hgtSell ?? f.shSell ?? 0;
        const sgtBuy = f.sgtBuy ?? f.szBuy ?? 0;
        const sgtSell = f.sgtSell ?? f.szSell ?? 0;
        return {
          time: f.time ?? f.minute ?? "",
          hgtBuy,
          hgtSell,
          sgtBuy,
          sgtSell,
          netFlow: hgtBuy - hgtSell + sgtBuy - sgtSell,
        };
      });
      return { data: items, source: "ths" };
    } catch (err) {
      return { data: null, error: String(err), source: "ths" };
    }
  }

  /** Get consensus EPS estimates for a stock. */
  async getConsensusEPS(code: string): Promise<DataResult<ConsensusEPS | null>> {
    const c = normalizeCode(code);
    const url = `${THS_BASE}/api/stockph/consensus/eps/${c}`;
    try {
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } }, this.timeout);
      if (!res.ok) return { data: null, error: `HTTP ${res.status}`, source: "ths" };

      const d = await res.json();
      const data = d?.data ?? d?.result ?? {};
      if (!data || Object.keys(data).length === 0) return { data: null, error: "No consensus data", source: "ths" };

      return {
        data: {
          stockCode: c,
          stockName: data.stockName ?? data.name ?? "",
          eps2025: data.eps2025 ?? data.eps0 ?? 0,
          eps2026: data.eps2026 ?? data.eps1 ?? 0,
          eps2027: data.eps2027 ?? data.eps2 ?? 0,
          analystCount: data.analystCount ?? data.count ?? 0,
          targetPrice: data.targetPrice ?? data.target ?? 0,
        },
        source: "ths",
      };
    } catch (err) {
      return { data: null, error: String(err), source: "ths" };
    }
  }
}
