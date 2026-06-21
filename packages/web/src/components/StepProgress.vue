<template>
  <div>
    <h2
      class="text-sm font-semibold mb-4 pb-2 border-b"
      style="color: var(--text-primary); border-color: var(--border-default); letter-spacing: 0.02em;"
    >分析流程</h2>
    <div v-if="steps.length === 0" class="text-center py-5" style="color: var(--text-muted); font-size: 13px;">
      等待分析开始...
    </div>
    <div v-else class="flex flex-wrap items-start gap-1">
      <template v-for="(step, index) in steps" :key="step.id">
        <!-- connector line -->
        <div v-if="index > 0" class="flex items-center mx-1">
          <span class="w-5 h-px" style="background: var(--border-default);"></span>
          <span class="text-xs ml-0.5" style="color: var(--text-muted);">▸</span>
        </div>
        <!-- step capsule -->
        <div
          class="flex items-start gap-2 px-3.5 py-2.5 rounded-lg min-w-[140px] transition-all duration-300 glass-panel"
          :style="stepStyle(step)"
        >
          <span
            class="inline-block w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
            :style="dotStyle(step)"
          ></span>
          <div class="flex flex-col gap-0.5">
            <span class="text-[13px] font-semibold" style="color: var(--text-primary);">{{ step.id }}</span>
            <span class="text-[11px]" style="color: var(--text-secondary);">{{ step.type }}</span>
            <span v-if="step.agentIds.length > 0" class="text-[11px]" style="color: var(--cyan);">
              {{ step.agentIds.join(", ") }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StepState } from "@/stores/analysis";

const props = defineProps<{ steps: StepState[] }>();

function dotStyle(step: StepState): Record<string, string> {
  switch (step.status) {
    case "complete": return { background: "var(--teal)", boxShadow: "0 0 6px var(--teal)" };
    case "running": return { background: "var(--cyan)", boxShadow: "0 0 10px var(--cyan)", animation: "glow-pulse 1.2s ease-in-out infinite" };
    case "error": return { background: "var(--rose)", boxShadow: "0 0 8px var(--rose)", animation: "shake 0.3s ease-in-out" };
    default: return { background: "var(--text-muted)" };
  }
}

function stepStyle(step: StepState): Record<string, string> {
  switch (step.status) {
    case "running": return { borderColor: "var(--cyan)", boxShadow: "var(--shadow-active)", animation: "fade-in 0.3s ease-out" };
    case "complete": return { borderColor: "rgba(0, 229, 160, 0.3)" };
    case "error": return { borderColor: "rgba(255, 68, 102, 0.4)" };
    default: return {};
  }
}
</script>
