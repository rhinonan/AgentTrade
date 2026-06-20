import { Controller, Post, Get, Body, Param, ValidationPipe, UsePipes } from "@nestjs/common";
import { AnalyzeService } from "./analyze.service.js";
import { StartAnalysisDto } from "./dto/start-analysis.dto.js";
import { WORKFLOWS } from "../workflows/index.js";

@Controller("api")
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  @Post("analyze")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async startAnalysis(@Body() dto: StartAnalysisDto) {
    return this.analyzeService.startAnalysis(dto);
  }

  @Get("analyze/:sessionId")
  async getSessionStatus(@Param("sessionId") sessionId: string) {
    const session = this.analyzeService.getSession(sessionId);
    if (!session) {
      return { error: "Session not found" };
    }
    return {
      sessionId: session.id,
      status: session.status,
      error: session.error,
    };
  }

  @Get("workflows")
  getWorkflows() {
    return Object.entries(WORKFLOWS).map(([name, dag]) => ({
      name,
      description: dag.description,
    }));
  }
}
