import { Module } from "@nestjs/common";
import { AnalyzeService } from "./analyze.service.js";
import { AnalyzeGateway } from "./analyze.gateway.js";
import { AnalyzeController } from "./analyze.controller.js";

@Module({
  controllers: [AnalyzeController],
  providers: [AnalyzeService, AnalyzeGateway],
  exports: [AnalyzeService],
})
export class AnalyzeModule {}
