import { describe, it, expect } from "vitest";
import { AgentRegistry } from "../../registry.js";
import { createContext } from "../../context.js";
import { executeCritique } from "../critique.js";
import { executeSynthesize } from "../synthesize.js";
import { executeDebate } from "../debate.js";
import { executePanel } from "../panel.js";
import { executeVote } from "../vote.js";
import type { BaseAgent, ExecutionContext, WorkflowStep, Analysis } from "../../types.js";

class FakeChatModel {
  async invoke() {
    return { content: '{"conclusion":"评定: 多空双方均有道理","confidence":0.6,"sentiment":"neutral","reasoning":["综合判断"]}' };
  }
}

function agent(id: string, stance: "bullish" | "bearish" | "neutral" = "neutral"): BaseAgent {
  return {
    id, name: id,
    capabilities: [stance, "judge"],
    personality: { stance },
    tools: [],
    async analyze(_ctx: ExecutionContext): Promise<Analysis> {
      return { conclusion: `${id}结论`, confidence: 0.7, sentiment: stance, reasoning: ["理由"] };
    },
    canCritique: true,
  };
}

describe("executeCritique", () => {
  it("critiques a target step's finding", async () => {
    const registry = new AgentRegistry();
    registry.register(agent("reviewer", "bearish"));

    // First add a finding to critique
    let ctx = createContext({ type: "stock", code: "600519" }, "分析");
    ctx = {
      ...ctx,
      findings: [{
        step: "bull-step", agent: "bull",
        analysis: { conclusion: "强烈看多", confidence: 0.9, sentiment: "bullish", reasoning: ["MACD金叉"] },
        timestamp: Date.now(),
      }],
    };

    const result = await executeCritique(
      { id: "critique-1", type: "critique", agent: { id: "reviewer" }, targetStep: "bull-step", prompt: "审阅" },
      registry, ctx,
      { llm: new FakeChatModel() as any },
    );

    expect(result.findings).toHaveLength(2); // original + critique
    expect(result.findings[1].step).toBe("critique-1");
  });
});

describe("executeSynthesize", () => {
  it("synthesizes from agent by id", async () => {
    const registry = new AgentRegistry();
    registry.register(agent("judge"));

    const result = await executeSynthesize(
      { id: "synth", type: "synthesize", agent: { id: "judge" }, prompt: "综合判断 {target}" },
      registry,
      createContext({ type: "stock", code: "600519", name: "茅台" }, "分析"),
      { llm: new FakeChatModel() as any },
    );

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].agent).toBe("judge");
  });
});

describe("executeDebate", () => {
  it("runs a debate between two agents and records findings and rounds", async () => {
    const registry = new AgentRegistry();
    registry.register(agent("bull", "bullish"));
    registry.register(agent("bear", "bearish"));

    const step: WorkflowStep = {
      id: "debate-1",
      type: "debate",
      agent: [{ id: "bull" }, { id: "bear" }],
      maxRounds: 1,
      prompt: "就 {target} 进行辩论",
    };

    const ctx = createContext({ type: "stock", code: "600519", name: "茅台" }, "辩论分析");

    const result = await executeDebate(step, registry, ctx, {
      llm: new FakeChatModel() as any,
    });

    // Each agent produces a finding per round; with 2 agents and 1 round = 2 findings
    expect(result.findings.length).toBeGreaterThanOrEqual(2);
    expect(result.debateRounds).toHaveLength(1);
    expect(result.debateRounds[0].entries).toHaveLength(2);
  });

  it("throws when fewer than 2 agents provided", async () => {
    const registry = new AgentRegistry();
    registry.register(agent("solo"));

    const step: WorkflowStep = {
      id: "bad-debate",
      type: "debate",
      agent: { id: "solo" },
    };

    await expect(
      executeDebate(step, registry, createContext({ type: "stock", code: "x" }, "test"))
    ).rejects.toThrow("Debate requires at least 2 agents");
  });
});

describe("executePanel", () => {
  it("runs multiple agents in parallel and merges findings", async () => {
    const registry = new AgentRegistry();
    registry.register(agent("analyst1", "bullish"));
    registry.register(agent("analyst2", "bearish"));

    const step: WorkflowStep = {
      id: "panel-1",
      type: "panel",
      match: { capability: "judge" },
      prompt: "分析 {target}",
    };

    const ctx = createContext({ type: "stock", code: "600519", name: "茅台" }, "面板分析");

    const result = await executePanel(step, registry, ctx, {
      llm: new FakeChatModel() as any,
    });

    // Both agents matched by "judge" capability
    expect(result.findings.length).toBeGreaterThanOrEqual(2);
  });

  it("throws when no agents match", async () => {
    const registry = new AgentRegistry();
    const step: WorkflowStep = {
      id: "empty-panel",
      type: "panel",
      match: { capability: "nonexistent" },
    };

    await expect(
      executePanel(step, registry, createContext({ type: "stock", code: "x" }, "test"))
    ).rejects.toThrow("No agents matched");
  });
});

describe("executeVote", () => {
  it("delegates to panel with a vote-specific prompt", async () => {
    const registry = new AgentRegistry();
    registry.register(agent("voter1", "bullish"));
    registry.register(agent("voter2", "bearish"));

    const step: WorkflowStep = {
      id: "vote-1",
      type: "vote",
      match: { capability: "judge" },
    };

    const ctx = createContext({ type: "stock", code: "600519", name: "茅台" }, "投票分析");

    const result = await executeVote(step, registry, ctx, {
      llm: new FakeChatModel() as any,
    });

    expect(result.findings.length).toBeGreaterThanOrEqual(2);
  });
});
