/**
 * Smoke test for web-fetch tool.
 * Run: npx tsx scripts/smoke-test-web-fetch.ts
 *
 * This makes real network calls -- use sparingly.
 */

import { webFetchTool } from "../lib/tools/web-fetch/index.js";
import type { ToolContext } from "../lib/tools/types.js";

async function main() {
  const ctx: ToolContext = {
    dataClient: {} as any,
    target: { type: "stock", code: "600519", name: "茅台" },
    executionState: {} as any,
    signal: new AbortController().signal,
  };

  console.log("=== Test 1: Search without content fetch ===");
  const r1 = await webFetchTool.execute({ query: "茅台 2025 财报" }, ctx);
  console.log(r1.slice(0, 500));
  console.log();

  console.log("=== Test 2: Search with content fetch ===");
  const r2 = await webFetchTool.execute(
    { query: "茅台 2025 财报", fetch_content: true },
    ctx,
  );
  console.log(r2.slice(0, 1000));
}

main().catch(console.error);
