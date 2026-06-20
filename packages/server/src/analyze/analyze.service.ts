import { Injectable, Logger, Inject } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  AgentRegistry,
  registerInstances,
  WorkflowScheduler,
  createContext,
  setDefaultLLMProvider,
  type AnalysisTarget,
  type ExecutionContext,
  type Finding,
} from "@agenttrade/core";
import { TechnicalAnalystAgent, FinancialReportAgent, JudgeAgent } from "@agenttrade/agents";
import { DataClient } from "@agenttrade/data-client";
import { AnalyzeGateway } from "./analyze.gateway.js";
import { StartAnalysisDto } from "./dto/start-analysis.dto.js";
import { WORKFLOWS } from "../workflows/index.js";

interface Session {
  id: string;
  context: ExecutionContext | null;
  status: "running" | "complete" | "error";
  error?: string;
}

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);
  private sessions = new Map<string, Session>();
  private currentStepId: string | null = null;

  constructor(@Inject(AnalyzeGateway) private readonly gateway: AnalyzeGateway) {}

  async startAnalysis(dto: StartAnalysisDto): Promise<{ sessionId: string }> {
    const sessionId = randomUUID();
    const session: Session = { id: sessionId, context: null, status: "running" };
    this.sessions.set(sessionId, session);

    // Run analysis asynchronously — don't block the HTTP response
    this.runAnalysis(sessionId, dto).catch((err) => {
      this.logger.error(`Analysis ${sessionId} failed:`, err);
      session.status = "error";
      session.error = err.message;
      if (this.currentStepId) {
        this.gateway.sendToClient(sessionId, "step:error", {
          stepId: this.currentStepId,
          message: err.message,
        });
      }
      this.gateway.sendToClient(sessionId, "analysis:error", {
        message: err.message,
      });
    });

    return { sessionId };
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  private async runAnalysis(sessionId: string, dto: StartAnalysisDto): Promise<void> {
    const session = this.sessions.get(sessionId)!;

    // Set provider
    if (dto.provider) {
      setDefaultLLMProvider(dto.provider as "anthropic" | "openai" | "deepseek");
    }

    // Select workflow
    const workflowDag = WORKFLOWS[dto.workflow ?? "bull-bear"];
    if (!workflowDag) {
      throw new Error(`Unknown workflow: ${dto.workflow}`);
    }

    // Determine analysis target
    const target = await this.resolveTarget(dto);

    // Emit start event
    this.gateway.sendToClient(sessionId, "analysis:start", {
      target: { type: target.type, code: target.code, name: target.name },
      workflow: dto.workflow ?? "bull-bear",
    });

    // Setup agent registry
    const registry = new AgentRegistry();
    registerInstances(registry, [
      new TechnicalAnalystAgent({ id: "technical-bull", personality: { stance: "bullish", style: "optimistic" } }),
      new TechnicalAnalystAgent({ id: "technical-bear", personality: { stance: "bearish", style: "skeptical" } }),
      new TechnicalAnalystAgent({ id: "technical-neutral", personality: { stance: "neutral" } }),
      new FinancialReportAgent({ id: "financial-bull", personality: { stance: "bullish" } }),
      new FinancialReportAgent({ id: "financial-bear", personality: { stance: "bearish" } }),
      new FinancialReportAgent({ id: "financial-neutral", personality: { stance: "neutral" } }),
      new JudgeAgent(),
    ]);

    const scheduler = new WorkflowScheduler(registry);
    const context = createContext(
      target,
      `对${target.name ?? target.code}进行分析`,
      dto.workflow ?? "bull-bear",
    );

    // Execute with event callbacks
    const result = await scheduler.execute(
      workflowDag,
      context,
      { provider: dto.provider as any, modelName: dto.model },
      {
        onStepStart: (stepId, type) => {
          this.currentStepId = stepId;
          // Determine which agents are involved in this step
          const stepDef = workflowDag.steps.find(s => s.id === stepId);
          const agentIds = this.extractAgentIds(stepDef, registry);
          this.gateway.sendToClient(sessionId, "step:start", {
            stepId,
            type,
            agentIds,
          });
        },
        onStepComplete: (stepId, ctx) => {
          const stepFindings = ctx.findings
            .filter((f: Finding) => f.step === stepId || f.step.startsWith(stepId))
            .map((f: Finding) => ({
              agent: f.agent,
              conclusion: f.analysis.conclusion,
              sentiment: f.analysis.sentiment,
              confidence: f.analysis.confidence,
            }));
          this.gateway.sendToClient(sessionId, "step:complete", {
            stepId,
            findings: stepFindings,
          });
        },
      },
    );

    // Store result
    session.context = result;
    session.status = "complete";

    // Send complete event with all findings
    this.gateway.sendToClient(sessionId, "analysis:complete", {
      context: {
        target: result.target,
        workflowName: result.workflowName,
        findings: result.findings.map((f: Finding) => ({
          step: f.step,
          agent: f.agent,
          analysis: f.analysis,
          timestamp: f.timestamp,
        })),
        debateRounds: result.debateRounds,
      },
    });
  }

  private async resolveTarget(dto: StartAnalysisDto): Promise<AnalysisTarget> {
    const client = new DataClient({ baseUrl: dto.dataServiceUrl });

    if (dto.sector) {
      const target: AnalysisTarget = { type: "sector", code: dto.sector };
      try {
        const info = await client.sector.constituents(dto.sector);
        target.name = info.name;
      } catch { /* use code as name */ }
      return target;
    }

    if (dto.index) {
      return { type: "index", code: dto.index };
    }

    if (dto.code) {
      const target: AnalysisTarget = { type: "stock", code: dto.code };
      try {
        const info = await client.reference.get(dto.code);
        target.name = info.name;
      } catch { /* use code as name */ }
      return target;
    }

    throw new Error("Must specify code, sector, or index");
  }

  private extractAgentIds(stepDef: any, _registry: AgentRegistry): string[] {
    if (!stepDef) return [];
    const ids: string[] = [];

    // Handle agent/match configs from step definition
    if (stepDef.agent) {
      const agents = Array.isArray(stepDef.agent) ? stepDef.agent : [stepDef.agent];
      for (const a of agents) {
        if (a.id) ids.push(a.id);
      }
    }
    if (stepDef.match?.id) ids.push(stepDef.match.id);
    if (stepDef.children) {
      for (const child of stepDef.children) {
        ids.push(...this.extractAgentIds(child, _registry));
      }
    }
    return [...new Set(ids)];
  }
}
