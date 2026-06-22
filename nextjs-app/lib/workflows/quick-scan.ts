import { defineWorkflow, analyze, synthesize } from "../engine/builder.js";

export const quickScanWorkflow = defineWorkflow({
  name: "quick-scan",
  description: "快速扫描 — 技术面+基本面并行分析后裁判给出简要研判"
})
.step("tech", analyze({
  agent: { capability: "technical" },
  prompt: "对 {target} 进行快速技术面扫描，找出关键信号。",
}))
.step("fundamental", analyze({
  agent: { capability: "fundamental" },
  prompt: "对 {target} 进行快速基本面扫描，关注估值和财务指标。",
}))
.step("final", synthesize({
  agent: "judge",
  prompt: "综合技术面和基本面扫描结果，对 {target} 给出简要研判。",
}))
.build();
