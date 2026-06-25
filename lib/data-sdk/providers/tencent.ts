// lib/data-sdk/providers/tencent.ts
// 腾讯财经 (qt.gtimg.cn) — real-time quotes, indices, ETFs, search.
// Also includes Baidu (finance.pae.baidu.com) for K-line data.
// Priority 1 data source — does not block IPs, no rate limit needed.

import type { DataResult, Quote, IndexQuote, ETFQuote, SearchResult, KlineBar, KlineOptions } from "../types.js";
import { normalizeCode, toTencentCode, decodeGBK, fetchWithTimeout } from "../utils.js";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

interface BaiduKlineResponse {
  Result?: {
    newMarketData?: {
      keys: string[];
      marketData: string;
    };
  };
}

export class TencentProvider {
  private timeout: number;

  constructor(timeout: number = 10_000) {
    this.timeout = timeout;
  }

  // ─── Real-time quotes ───

  /**
   * Batch fetch real-time quotes from Tencent Finance.
   * Returns PE(TTM), PB, market cap, turnover, limit up/down, etc.
   * Supports stocks, indices (000001=上证, 000300=沪深300, 399006=创业板), ETFs (510050, 510300).
   * Endpoint: GET https://qt.gtimg.cn/q={prefixed_codes}
   */
  async getQuotes(codes: string[]): Promise<DataResult<Record<string, Quote>>> {
    const prefixed = codes.map(toTencentCode);
    const url = `https://qt.gtimg.cn/q=${prefixed.join(",")}`;

    try {
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } }, this.timeout);
      if (!res.ok) {
        return { data: null, error: `HTTP ${res.status}: ${res.statusText}`, source: "tencent" };
      }
      const buf = await res.arrayBuffer();
      const text = decodeGBK(buf);
      return { data: this._parseQuotes(text, codes), source: "tencent" };
    } catch (err) {
      return { data: null, error: String(err), source: "tencent" };
    }
  }

  /** Parse Tencent's "~" separated GBK response into Quote objects. */
  private _parseQuotes(text: string, codes: string[]): Record<string, Quote> {
    const result: Record<string, Quote> = {};
    const lines = text.split(";").filter((l) => l.trim() && l.includes("=") && l.includes('"'));

    for (const line of lines) {
      const vals = line.split('"')[1]?.split("~");
      if (!vals || vals.length < 53) continue;

      const code = vals[2]; // e.g. "600519"
      if (!code || !codes.some((c) => normalizeCode(c) === code)) continue;

      const q: Quote = {
        symbol: code,
        name: vals[1] || "",
        price: parseFloat(vals[3]) || 0,
        lastClose: parseFloat(vals[4]) || 0,
        open: parseFloat(vals[5]) || 0,
        high: parseFloat(vals[33]) || 0,
        low: parseFloat(vals[34]) || 0,
        changeAmt: parseFloat(vals[31]) || 0,
        changePct: parseFloat(vals[32]) || 0,
        turnoverPct: parseFloat(vals[38]) || 0,
        amplitudePct: parseFloat(vals[43]) || 0,
        peTtm: parseFloat(vals[39]) || 0,
        peStatic: parseFloat(vals[52]) || 0,
        pb: parseFloat(vals[46]) || 0,
        marketCapYi: parseFloat(vals[44]) || 0,
        floatMarketCapYi: parseFloat(vals[45]) || 0,
        limitUp: parseFloat(vals[47]) || 0,
        limitDown: parseFloat(vals[48]) || 0,
        volumeRatio: parseFloat(vals[49]) || 0,
        amountWan: parseFloat(vals[37]) || 0,
      };
      result[code] = q;
    }
    return result;
  }

  /** Fetch quotes for a single stock. */
  async getQuote(code: string): Promise<DataResult<Quote | null>> {
    try {
      const r = await this.getQuotes([code]);
      if (!r.data) return { data: null, error: r.error, source: r.source };
      const q = r.data[normalizeCode(code)];
      return { data: q ?? null, source: r.source, error: q ? undefined : `No data for ${code}` };
    } catch (err) {
      return { data: null, error: String(err), source: "tencent" };
    }
  }

  // ─── Index quotes ───

  /** Fetch index quotes (上证000001, 沪深300 000300, 创业板399006, etc.) */
  async getIndexQuotes(codes: string[]): Promise<DataResult<IndexQuote[]>> {
    const prefixed = codes.map((c) => `s_${toTencentCode(c)}`);
    const url = `https://qt.gtimg.cn/q=${prefixed.join(",")}`;

    try {
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } }, this.timeout);
      if (!res.ok) return { data: null, error: `HTTP ${res.status}: ${res.statusText}`, source: "tencent" };
      const buf = await res.arrayBuffer();
      const text = decodeGBK(buf);
      const items: IndexQuote[] = [];
      for (const line of text.split(";")) {
        const vals = line.split('"')[1]?.split("~");
        if (!vals || vals.length < 10) continue;
        items.push({
          symbol: vals[2],
          name: vals[1],
          price: parseFloat(vals[3]) || 0,
          lastClose: parseFloat(vals[4]) || 0,
          changePct: parseFloat(vals[32]) || 0,
          changeAmt: parseFloat(vals[31]) || 0,
          high: parseFloat(vals[33]) || 0,
          low: parseFloat(vals[34]) || 0,
          amountWan: parseFloat(vals[37]) || 0,
        });
      }
      return { data: items, source: "tencent" };
    } catch (err) {
      return { data: null, error: String(err), source: "tencent" };
    }
  }

  // ─── ETF quotes ───

  /** Fetch ETF quotes (510050, 510300, etc.) */
  async getETFQuotes(codes: string[]): Promise<DataResult<ETFQuote[]>> {
    try {
      const r = await this.getQuotes(codes);
      if (!r.data) return { data: null, error: r.error, source: r.source };
      const items: ETFQuote[] = Object.values(r.data).map((q) => ({
        symbol: q.symbol,
        name: q.name,
        price: q.price,
        lastClose: q.lastClose,
        changePct: q.changePct,
        peTtm: q.peTtm,
        pb: q.pb,
      }));
      return { data: items, source: "tencent" };
    } catch (err) {
      return { data: null, error: String(err), source: "tencent" };
    }
  }

  // ─── K-line (via Baidu Finance — HTTP, no IP block) ───

  /**
   * Fetch K-line data.
   * Source: Baidu Finance (finance.pae.baidu.com). No IP block, no auth.
   * ktype: 1=daily, 2=weekly, 3=monthly.
   */
  async getKline(code: string, opts: KlineOptions = {}): Promise<DataResult<KlineBar[]>> {
    const { period = "daily" } = opts;
    const ktypeMap: Record<string, string> = { daily: "1", weekly: "2", monthly: "3" };
    const ktype = ktypeMap[period] ?? "1";

    const url = `https://finance.pae.baidu.com/selfselect/getstockquotation?all=1&isIndex=false&isBk=false&isBlock=false&isFutures=false&isStock=true&newFormat=1&group=quotation_kline_ab&finClientType=pc&code=${normalizeCode(code)}&ktype=${ktype}&start_time=`;

    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          "User-Agent": UA,
          "Accept": "application/vnd.finance-web.v1+json",
          "Origin": "https://gushitong.baidu.com",
          "Referer": "https://gushitong.baidu.com/",
        },
      }, this.timeout);

      if (!res.ok) return { data: null, error: `HTTP ${res.status}: ${res.statusText}`, source: "baidu" };
      const d: BaiduKlineResponse = await res.json();
      const md = d?.Result?.newMarketData;
      if (!md) return { data: null, error: "No market data in response", source: "baidu" };

      const keys: string[] = md.keys ?? [];
      const rows: string[] = (md.marketData ?? "").split(";").filter(Boolean);

      // Map known key positions
      const idx = (name: string) => keys.indexOf(name);
      const timeIdx = idx("time"), openIdx = idx("open"), closeIdx = idx("close");
      const highIdx = idx("high"), lowIdx = idx("low");
      const volIdx = idx("volume"), amtIdx = idx("amount");

      if (timeIdx < 0) {
        return { data: null, error: "Unexpected response format: missing 'time' field", source: "baidu" };
      }

      const bars: KlineBar[] = [];
      for (const row of rows) {
        const cols = row.split(",");
        if (cols.length < keys.length) continue;
        bars.push({
          date: cols[timeIdx] ?? "",
          open: parseFloat(cols[openIdx]) || 0,
          close: parseFloat(cols[closeIdx]) || 0,
          high: parseFloat(cols[highIdx]) || 0,
          low: parseFloat(cols[lowIdx]) || 0,
          volume: parseFloat(cols[volIdx]) || 0,
          amount: amtIdx >= 0 ? (parseFloat(cols[amtIdx]) || 0) : undefined,
        });
      }
      return { data: bars, source: "baidu" };
    } catch (err) {
      return { data: null, error: String(err), source: "baidu" };
    }
  }

  // ─── Search ───

  /** Decode Unicode escapes in a string (e.g. "贵州" → "贵州"). */
  private _decodeUnicode(str: string): string {
    return str.replace(/\\u([\da-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  /**
   * Search stocks/indices/ETFs by keyword or code.
   * Endpoint: GET https://smartbox.gtimg.cn/s3/?q={keyword}&t=all
   * Response format: "v_hint=\"sh~600519~\\u8d35\\u5dde\\u8305\\u53f0~gzmt~GP-A^sz~000001~...~ZS\""
   * Fields: {market}~{code}~{unicode_name}~{pinyin}~{type}
   * Multiple results are separated by "^".
   */
  async search(keyword: string): Promise<DataResult<SearchResult[]>> {
    const url = `https://smartbox.gtimg.cn/s3/?q=${encodeURIComponent(keyword)}&t=all`;
    try {
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } }, this.timeout);
      if (!res.ok) return { data: null, error: `HTTP ${res.status}: ${res.statusText}`, source: "tencent" };
      const buf = await res.arrayBuffer();
      const text = decodeGBK(buf);
      // Response: v_hint="entry1^entry2^entry3";
      const hintMatch = text.match(/"([^"]+)"/);
      if (!hintMatch || hintMatch[1] === "N") {
        return { data: [], source: "tencent" };
      }

      const entries = hintMatch[1].split("^");
      const re = /^([a-z]{2})~(\d{6})~([^~]+)~([^~]+)~(.+)$/;
      const typeMap: Record<string, string> = {
        GP: "stock", "GP-A": "stock", "GP-B": "stock",
        ZS: "index",
        ETF: "etf",
        LOF: "fund", KJ: "fund", FJ: "fund",
      };

      // Priority: stock > etf > index > fund > other (lower number = higher priority)
      const typePriority: Record<string, number> = {
        stock: 0, etf: 1, index: 2, fund: 3, other: 4,
      };

      const seen = new Map<string, { result: SearchResult; priority: number }>();
      for (const entry of entries) {
        const m = re.exec(entry.trim());
        if (!m) continue;
        const rawType = m[5];
        const baseType = rawType.split("-")[0] ?? rawType;
        const type = typeMap[rawType] ?? typeMap[baseType] ?? "other";
        const priority = typePriority[type] ?? 99;
        const symbol = m[2];
        const existing = seen.get(symbol);
        if (!existing || priority < existing.priority) {
          seen.set(symbol, {
            result: {
              symbol,
              name: this._decodeUnicode(m[3]),
              type,
            },
            priority,
          });
        }
      }
      const results = Array.from(seen.values()).map(v => v.result);
      return { data: results, source: "tencent" };
    } catch (err) {
      return { data: null, error: String(err), source: "tencent" };
    }
  }
}
