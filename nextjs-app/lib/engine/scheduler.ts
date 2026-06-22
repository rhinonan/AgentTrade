import type { WorkflowDAG, WorkflowStep, ExecutionContext } from "./types.js";
import type { AgentRegistry } from "./registry.js";
import type { AnalyzeOptions } from "../llm/create-llm.js";
import { executeAnalyze } from "./primitives/analyze.js";
import { executePanel } from "./primitives/panel.js";
import { executeCritique } from "./primitives/critique.js";
import { executeDebate } from "./primitives/debate.js";
import { executeVote } from "./primitives/vote.js";
import { executeSynthesize } from "./primitives/synthesize.js";

export interface SchedulerEvents {
  onStepStart?: (stepId: string, type: string) => void;
  onStepComplete?: (stepId: string, context: ExecutionContext) => void;
}

export class WorkflowScheduler {
  constructor(private registry: AgentRegistry) {}

  async execute(
    dag: WorkflowDAG,
    context: ExecutionContext,
    options: AnalyzeOptions = {},
    events: SchedulerEvents = {},
  ): Promise<ExecutionContext> {
    let currentCtx = context;

    for (const step of dag.steps) {
      events.onStepStart?.(step.id, step.type);

      switch (step.type) {
        case "analyze":
          currentCtx = await executeAnalyze(step, this.registry, currentCtx, options);
          break;
        case "panel":
          currentCtx = await executePanel(step, this.registry, currentCtx, options);
          break;
        case "critique":
          currentCtx = await executeCritique(step, this.registry, currentCtx, options);
          break;
        case "debate":
          currentCtx = await executeDebate(step, this.registry, currentCtx, options);
          break;
        case "vote":
          currentCtx = await executeVote(step, this.registry, currentCtx, options);
          break;
        case "synthesize":
          currentCtx = await executeSynthesize(step, this.registry, currentCtx, options);
          break;
        case "parallel": {
          if (!step.children) break;
          const results = await Promise.all(
            step.children.map(child => this.executeSubStep(child, currentCtx, options))
          );
          const allFindings = results.flatMap(r => r.findings);
          const existingKeys = new Set(currentCtx.findings.map(f => `${f.step}|${f.agent}`));
          const trulyNew = allFindings.filter(f => !existingKeys.has(`${f.step}|${f.agent}`));
          currentCtx = { ...currentCtx, findings: [...currentCtx.findings, ...trulyNew] };
          break;
        }
        case "sequential":
          if (step.children) {
            for (const child of step.children) {
              currentCtx = await this.executeSubStep(child, currentCtx, options);
            }
          }
          break;
      }

      events.onStepComplete?.(step.id, currentCtx);
    }

    return currentCtx;
  }

  private async executeSubStep(
    step: WorkflowStep,
    context: ExecutionContext,
    options: AnalyzeOptions,
  ): Promise<ExecutionContext> {
    switch (step.type) {
      case "analyze": return executeAnalyze(step, this.registry, context, options);
      case "panel": return executePanel(step, this.registry, context, options);
      case "critique": return executeCritique(step, this.registry, context, options);
      case "debate": return executeDebate(step, this.registry, context, options);
      case "vote": return executeVote(step, this.registry, context, options);
      case "synthesize": return executeSynthesize(step, this.registry, context, options);
      default: throw new Error(`Unknown sub-step type: ${step.type}`);
    }
  }
}
