<template>
  <div class="mb-6">
    <h3 class="text-[15px] font-semibold mb-3.5" style="color: var(--text-primary); letter-spacing: 0.02em;">各方观点</h3>
    <div
      v-for="(f, i) in findings"
      :key="i"
      class="glass-panel p-3.5 mb-2.5 relative"
      style="overflow: hidden; animation: fade-in 0.3s ease-out;"
    >
      <!-- left accent bar -->
      <div
        class="absolute left-0 top-0 bottom-0 w-[3px]"
        :style="{ background: accentColor(f.sentiment), boxShadow: '0 0 8px ' + accentColor(f.sentiment) }"
      ></div>
      <div class="flex justify-between mb-2 pl-1">
        <span class="text-[13px] font-semibold" style="color: var(--cyan);">{{ f.agent }}</span>
        <span class="text-xs font-mono" style="color: var(--text-secondary);">{{ Math.round(f.confidence * 100) }}%</span>
      </div>
      <p class="text-sm leading-relaxed mb-1.5 pl-1" style="color: var(--text-primary);">{{ f.conclusion }}</p>
      <ul v-if="f.reasoning && f.reasoning.length > 0" class="mt-2 pl-[18px]">
        <li v-for="(r, j) in f.reasoning" :key="j" class="text-[13px] mb-0.5" style="color: var(--text-secondary); list-style: '▸ ';">
          {{ r }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Finding } from "@/stores/analysis";

defineProps<{ findings: Finding[] }>();

function accentColor(sentiment: string): string {
  switch (sentiment) {
    case "bullish": return "var(--teal)";
    case "bearish": return "var(--rose)";
    default: return "var(--text-secondary)";
  }
}
</script>
