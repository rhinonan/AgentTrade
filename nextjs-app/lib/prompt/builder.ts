import type { BaseAgent, ExecutionContext } from "../engine/types.js";

// ——— AgentPrompt ———

export interface AgentPrompt {
  identity: string;
  expertise?: string;
  stance?: string;
  methodology?: string;
  outputFormat: string;
}

// ——— Prompt Registry ———

const promptRegistry = new Map<string, AgentPrompt>();

export function registerPrompt(agentIdPrefix: string, prompt: AgentPrompt): void {
  promptRegistry.set(agentIdPrefix, prompt);
}

export function getPromptForAgent(agentId: string): AgentPrompt | undefined {
  // Try exact match first, then prefix match (e.g. "technical-bull" → "technical")
  if (promptRegistry.has(agentId)) return promptRegistry.get(agentId);
  for (const [prefix, prompt] of promptRegistry) {
    if (agentId.startsWith(prefix)) return prompt;
  }
  return undefined;
}

// ——— Default prompt (mirrors current behavior in analyze.ts / director.ts) ———

export const defaultPrompt: AgentPrompt = {
  identity: "你是一个专业的A股市场分析师。",
  outputFormat: `请用中文回复。输出JSON格式：
{"conclusion":"你的分析结论","confidence":0.0-1.0（置信度）,"sentiment":"bullish"|"bearish"|"neutral","reasoning":["论据1","论据2","论据3"]}`,
};

// ——— Builder ———

/**
 * Build the full system prompt for an agent by composing AgentPrompt sections.
 * If the agent has `systemPrompt` set (string or function), that takes priority.
 */
export function buildSystemPrompt(
  agent: BaseAgent,
  _context: ExecutionContext,
): string {
  // Agent-level override takes priority
  if (typeof agent.systemPrompt === "string") return agent.systemPrompt;
  if (typeof agent.systemPrompt === "function") return agent.systemPrompt(_context);

  // Look up registered prompt
  const prompt = getPromptForAgent(agent.id) ?? defaultPrompt;

  // Auto-generate tool descriptions from agent.tools
  const toolDesc =
    agent.tools.length > 0
      ? `\n你可以使用以下工具获取实时数据：\n${agent.tools
          .map((t) => `- ${t.name}: ${t.description}`)
          .join("\n")}\n\n使用工具时，请用中文描述你需要什么数据。`
      : "";

  return [
    prompt.identity,
    prompt.expertise,
    prompt.stance,
    prompt.methodology,
    toolDesc,
    prompt.outputFormat,
  ]
    .filter(Boolean)
    .join("\n\n");
}
