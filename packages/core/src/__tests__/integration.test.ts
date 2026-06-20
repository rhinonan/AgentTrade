import { describe, it, expect } from "vitest";
import { AgentRegistry } from "../agent/registry.js";
import { registerInstances } from "../agent/loader.js";
import { WorkflowScheduler } from "../workflow/scheduler.js";
import { defineWorkflow, analyze, parallel, critique, synthesize } from "../workflow/builder.js";
import { createContext } from "../workflow/context.js";
import { FakeChatModel } from "../llm/fake-model.js";
import type { BaseAgent, Analysis } from "../agent/types.js";
import type { ExecutionContext } from "../workflow/types.js";
import type { StructuredTool } from "@langchain/core/tools";

// Integration test: full bull-bear workflow with mock agents and fake LLM

function makeStanceAgent(id: string, stance: "bullish" | "bearish"): BaseAgent {
  return {
    id,
    name: id,
    capabilities: ["test", stance],
    personality: { stance },
    tools: [] as unknown as StructuredTool[],
    canCritique: true,
    canDebate: true,
    analyze: async (_ctx: ExecutionContext): Promise<Analysis> => ({
      conclusion: `${id}: ${stance} analysis conclusion`,
      confidence: 0.75,
      sentiment: stance,
      reasoning: [`${stance} reason 1`, `${stance} reason 2`, `${stance} reason 3`],
    }),
  };
}

function makeJudge(): BaseAgent {
  return {
    id: "judge",
    name: "裁决Agent",
    capabilities: ["judge"],
    personality: { stance: "neutral" },
    tools: [] as unknown as StructuredTool[],
    analyze: async (_ctx: ExecutionContext): Promise<Analysis> => ({
      conclusion: "综合裁决：短期偏多",
      confidence: 0.7,
      sentiment: "bullish",
      reasoning: ["综合来看多方论据更强", "空方的风险提示需关注"],
    }),
  };
}

describe("Integration: full bull-bear workflow", () => {
  it("executes the complete multi-agent adversarial flow", async () => {
    // Setup
    const registry = new AgentRegistry();
    registerInstances(registry, [
      makeStanceAgent("bull-tech", "bullish"),
      makeStanceAgent("bear-tech", "bearish"),
      makeJudge(),
    ]);

    // Define bull-bear workflow
    const dag = defineWorkflow({ name: "bull-bear-test", description: "集成测试" })
      .step("bull-analysis", analyze({
        agent: { capability: "bullish" },
        prompt: "从技术面看多 {target}",
      }))
      .step("bear-analysis", analyze({
        agent: { capability: "bearish" },
        prompt: "从技术面看空 {target}",
      }))
      .step("cross-critique", parallel([
        critique({ reviewer: "bull-tech", targetStep: "bear-analysis" }),
        critique({ reviewer: "bear-tech", targetStep: "bull-analysis" }),
      ]))
      .step("final", synthesize({ agent: "judge", prompt: "综合裁决" }))
      .build();

    // Fake LLM responses for 4 steps: bull-analysis, bear-analysis, 2 critiques, synthesize
    const fakeLLM = new FakeChatModel([
      { text: '{"conclusion":"技术面看多","confidence":0.8,"sentiment":"bullish","reasoning":["A","B","C"]}' },
      { text: '{"conclusion":"技术面看空","confidence":0.7,"sentiment":"bearish","reasoning":["X","Y","Z"]}' },
      { text: '{"conclusion":"审阅熊方：论据X较弱","confidence":0.6,"sentiment":"bullish","reasoning":["问题1","问题2"]}' },
      { text: '{"conclusion":"审阅牛方：论据A存疑","confidence":0.6,"sentiment":"bearish","reasoning":["问题1","问题2"]}' },
      { text: '综合研判：短期看多。\n```json\n{"conclusion":"短期看多","confidence":0.72,"sentiment":"bullish","reasoning":["多方更强","关注风险"]}\n```' },
    ]);

    const scheduler = new WorkflowScheduler(registry);
    const ctx = createContext(
      { type: "stock", code: "600519", name: "贵州茅台" },
      "分析短期走势",
      "bull-bear-test"
    );

    // Execute
    const result = await scheduler.execute(dag, ctx, { llm: fakeLLM }, {
      onStepStart: (_id) => { /* silent */ },
      onStepComplete: (_id, _c) => { /* silent */ },
    });

    // Verify
    expect(result.findings.length).toBeGreaterThanOrEqual(4); // at least bull, bear, 2 critiques, final
    expect(result.findings.length).toBeLessThanOrEqual(5);

    // Bull analysis exists
    const bullFinding = result.findings.find(f => f.step === "bull-analysis");
    expect(bullFinding).toBeDefined();
    expect(bullFinding!.analysis.sentiment).toBe("bullish");

    // Bear analysis exists
    const bearFinding = result.findings.find(f => f.step === "bear-analysis");
    expect(bearFinding).toBeDefined();
    expect(bearFinding!.analysis.sentiment).toBe("bearish");

    // Final synthesis exists
    const finalFinding = result.findings.find(f => f.step === "final");
    expect(finalFinding).toBeDefined();
    expect(finalFinding!.agent).toBe("judge");

    // Context propagated correctly
    expect(result.target.code).toBe("600519");
    expect(result.workflowName).toBe("bull-bear-test");
  });
});
