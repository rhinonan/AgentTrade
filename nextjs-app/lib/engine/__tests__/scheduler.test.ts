import { describe, it, expect, vi } from "vitest";
import { AgentRegistry } from "../registry.js";
import { WorkflowScheduler } from "../scheduler.js";
import { defineWorkflow, analyze, synthesize } from "../builder.js";
import { createContext } from "../context.js";
import type { BaseAgent, ExecutionContext, Analysis } from "../types.js";

class FakeModel {
  async invoke() {
    return { content: '{"conclusion":"测试分析","confidence":0.7,"sentiment":"neutral","reasoning":["理由1"]}' };
  }
}

function fakeAgent(id: string, capability = "tech"): BaseAgent {
  return {
    id, name: id, capabilities: [capability], personality: { stance: "neutral" }, tools: [],
    async analyze(_ctx: ExecutionContext): Promise<Analysis> {
      return { conclusion: `${id}结论`, confidence: 0.7, sentiment: "neutral", reasoning: [] };
    },
  };
}

describe("WorkflowScheduler", () => {
  it("executes a simple 2-step workflow", async () => {
    const registry = new AgentRegistry();
    registry.register(fakeAgent("agent1", "tech"));
    registry.register(fakeAgent("judge", "judge"));

    const dag = defineWorkflow({ name: "test" })
      .step("analyze", analyze({ agent: { capability: "tech" }, prompt: "分析 {target}" }))
      .step("final", synthesize({ agent: "judge", prompt: "综合" }))
      .build();

    const scheduler = new WorkflowScheduler(registry);
    const ctx = createContext({ type: "stock", code: "600519", name: "茅台" }, "分析茅台");
    const result = await scheduler.execute(dag, ctx, { llm: new FakeModel() as any });

    expect(result.findings.length).toBeGreaterThanOrEqual(2);
  });

  it("fires onStepStart and onStepComplete events", async () => {
    const registry = new AgentRegistry();
    registry.register(fakeAgent("agent1", "tech"));

    const dag = defineWorkflow({ name: "event-test" })
      .step("s1", analyze({ agent: { capability: "tech" }, prompt: "分析" }))
      .build();

    const onStepStart = vi.fn();
    const onStepComplete = vi.fn();

    const scheduler = new WorkflowScheduler(registry);
    await scheduler.execute(dag,
      createContext({ type: "stock", code: "x" }, "test"),
      { llm: new FakeModel() as any },
      { onStepStart, onStepComplete },
    );

    expect(onStepStart).toHaveBeenCalledWith("s1", "analyze");
    expect(onStepComplete).toHaveBeenCalled();
  });
});
