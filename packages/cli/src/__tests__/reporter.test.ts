import { describe, it, expect } from "vitest";
import { Reporter } from "../reporter.js";
import type { ExecutionContext } from "@agenttrade/core";

describe("Reporter", () => {
  it("can be instantiated", () => {
    const reporter = new Reporter();
    expect(reporter).toBeDefined();
  });

  it("startAnalysis does not throw", () => {
    const reporter = new Reporter();
    expect(() => reporter.startAnalysis({ type: "stock", code: "600519" }, "test")).not.toThrow();
  });

  it("renderReport handles empty context", () => {
    const reporter = new Reporter();
    const ctx: ExecutionContext = {
      target: { type: "stock", code: "000001" },
      task: "test",
      findings: [],
      debateRounds: [],
      workflowName: "test",
      startedAt: Date.now(),
    };
    expect(() => reporter.renderReport(ctx)).not.toThrow();
  });

  it("handles integration scenario: full bull-bear workflow context", () => {
    const reporter = new Reporter();

    // Simulate a complete bull-bear workflow result similar to the integration test
    const ctx: ExecutionContext = {
      target: { type: "stock", code: "600519", name: "贵州茅台" },
      task: "分析短期走势",
      workflowName: "bull-bear-test",
      startedAt: Date.now(),
      findings: [
        {
          step: "bull-analysis",
          agent: "bull-tech",
          analysis: {
            conclusion: "技术面看多",
            confidence: 0.8,
            sentiment: "bullish",
            reasoning: ["均线多头排列", "MACD金叉", "成交量放大"],
          },
          timestamp: Date.now() - 3000,
        },
        {
          step: "bear-analysis",
          agent: "bear-tech",
          analysis: {
            conclusion: "技术面看空",
            confidence: 0.7,
            sentiment: "bearish",
            reasoning: ["RSI超买", "上方压力位", "缩量上涨"],
          },
          timestamp: Date.now() - 2000,
        },
        {
          step: "cross-critique__child0",
          agent: "bull-tech",
          analysis: {
            conclusion: "审阅熊方：论据X较弱",
            confidence: 0.6,
            sentiment: "bullish",
            reasoning: ["RSI超买但未背离", "压力位可能被突破"],
          },
          timestamp: Date.now() - 1500,
        },
        {
          step: "cross-critique__child1",
          agent: "bear-tech",
          analysis: {
            conclusion: "审阅牛方：论据A存疑",
            confidence: 0.6,
            sentiment: "bearish",
            reasoning: ["均线排列可能滞后", "成交量放大不可持续"],
          },
          timestamp: Date.now() - 1000,
        },
        {
          step: "final",
          agent: "judge",
          analysis: {
            conclusion: "短期看多",
            confidence: 0.72,
            sentiment: "bullish",
            reasoning: ["多方更强", "关注风险"],
            rawOutput: "综合研判：短期看多。",
          },
          timestamp: Date.now(),
        },
      ],
      debateRounds: [],
    };

    // Should not throw when rendering a full workflow context
    expect(() => reporter.renderReport(ctx)).not.toThrow();
  });
});
