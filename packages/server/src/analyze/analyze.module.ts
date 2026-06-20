import { Module } from "@nestjs/common";
import { AnalyzeService } from "./analyze.service.js";
import { AnalyzeGateway } from "./analyze.gateway.js";

@Module({
  providers: [AnalyzeService, AnalyzeGateway],
  exports: [AnalyzeService],
})
export class AnalyzeModule {}
