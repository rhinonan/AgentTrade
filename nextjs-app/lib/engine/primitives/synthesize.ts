import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { AgentRegistry } from "../registry.js";
import type { AgentMatch, ExecutionContext, WorkflowStep, Analysis } from "../types.js";
import { addFinding } from "../context.js";
import { createLLM, type AnalyzeOptions } from "../../llm/create-llm.js";
import { parseLLMJson, parseSentiment } from "../../llm/parse.js";

export async function executeSynthesize(
  step: WorkflowStep,
  registry: AgentRegistry,
  context: ExecutionContext,
  options: AnalyzeOptions = {},
): Promise<ExecutionContext> {
  const match: AgentMatch | undefined = Array.isArray(step.agent) ? step.agent[0] : (step.agent ?? undefined);
  const agentId = match?.id;
  if (!agentId) throw new Error("Synthesize step requires agent.id");
  const agent = registry.get(agentId);
  if (!agent) throw new Error(`Agent "${agentId}" not found`);

  const llm = createLLM(options);

  const allFindingsText = context.findings.map(f =>
    `[步骤${f.step}][${f.agent}](${f.analysis.sentiment}, conf=${f.analysis.confidence}): ${f.analysis.conclusion}`
  ).join("\n");

  const prompt = (step.prompt ?? "综合各Agent分析，给出最终结论")
    .replace("{target}", context.target.name ?? context.target.code);

  const messages = [
    new SystemMessage("你是裁判分析师。综合所有分析的论点，给出平衡的最终研判。输出JSON: {\"conclusion\":\"综合结论+操作建议\",\"confidence\":0.0-1.0,\"sentiment\":\"bullish|bearish|neutral\",\"reasoning\":[关键论据,...]}"),
    new HumanMessage(`${prompt}\n\n已有分析：\n${allFindingsText}`),
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
    return addFinding(context, step.id, agentId, analysis);
  } catch {
    return addFinding(context, step.id, agentId, {
      conclusion: text.slice(0, 200), confidence: 0.5, sentiment: "neutral", reasoning: [], rawOutput: text,
    });
  }
}
