import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { AgentRegistry } from "../registry.js";
import type { AgentMatch, ExecutionContext, WorkflowStep, Analysis } from "../types.js";
import { addFinding } from "../context.js";
import { createLLM, type AnalyzeOptions } from "../../llm/create-llm.js";
import { parseLLMJson, parseSentiment } from "../../llm/parse.js";

export async function executeCritique(
  step: WorkflowStep,
  registry: AgentRegistry,
  context: ExecutionContext,
  options: AnalyzeOptions = {},
): Promise<ExecutionContext> {
  const match: AgentMatch | undefined = Array.isArray(step.agent) ? step.agent[0] : (step.agent ?? undefined);
  const reviewerId = match?.id;
  if (!reviewerId) throw new Error("Critique step requires agent.id (reviewer)");
  const reviewer = registry.get(reviewerId);
  if (!reviewer) throw new Error(`Reviewer agent "${reviewerId}" not found`);

  const targetStep = step.targetStep!;
  const targetFindings = context.findings.filter(f => f.step === targetStep);
  if (targetFindings.length === 0) throw new Error(`No findings for target step "${targetStep}"`);

  const llm = createLLM(options);
  const targetText = targetFindings.map(f =>
    `[${f.agent}]: ${f.analysis.conclusion} (${f.analysis.sentiment}, 置信度${f.analysis.confidence})\n理由: ${f.analysis.reasoning.join("; ")}`
  ).join("\n");

  const prompt = (step.prompt ?? `审阅步骤 ${targetStep} 的分析结论`)
    .replace("{target}", context.target.name ?? context.target.code);

  const messages = [
    new SystemMessage(`你是${reviewer.name}，立场${reviewer.personality.stance}。请审阅以下分析并给出批评意见。输出JSON: {"conclusion":"审阅意见","confidence":0.0-1.0,"sentiment":"bullish|bearish|neutral","reasoning":[...]}`),
    new HumanMessage(`${prompt}\n\n待审阅的分析：\n${targetText}`),
  ];

  const response = await llm.invoke(messages);
  const text = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  try {
    const parsed = parseLLMJson(text) as Record<string, unknown>;
    const analysis: Analysis = {
      conclusion: (parsed.conclusion as string) ?? text.slice(0, 100),
      confidence: Math.max(0, Math.min(1, (parsed.confidence as number) ?? 0.5)),
      sentiment: parseSentiment(parsed.sentiment),
      reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning as string[] : [],
      rawOutput: text,
    };
    return addFinding(context, step.id, reviewerId, analysis);
  } catch {
    return addFinding(context, step.id, reviewerId, {
      conclusion: text.slice(0, 200),
      confidence: 0.5,
      sentiment: "neutral",
      reasoning: [],
      rawOutput: text,
    });
  }
}
