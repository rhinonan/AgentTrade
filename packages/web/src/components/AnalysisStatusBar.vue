<template>
  <div
    v-if="store.target"
    ref="barRef"
    class="px-10 py-3 border-b"
    style="
      background: var(--glass-bg);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border-color: var(--border-default);
      animation: fly-from-center 0.45s ease-out;
    "
  >
    <div class="flex items-center gap-3 text-sm">
      <!-- Target type badge -->
      <span
        class="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider"
        :style="{
          background: store.targetType === 'stock'
            ? 'rgba(0, 212, 255, 0.1)'
            : 'rgba(0, 229, 160, 0.1)',
          color: store.targetType === 'stock' ? 'var(--cyan)' : 'var(--teal)',
          border: `1px solid ${store.targetType === 'stock' ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 229, 160, 0.3)'}`,
        }"
      >
        {{ store.targetType === 'stock' ? '个股' : '板块' }}
      </span>

      <!-- Target name -->
      <span class="font-semibold" style="color: var(--text-primary);">
        {{ store.target.code }}
        <span v-if="store.target.name" style="color: var(--text-secondary);">
          {{ store.target.name }}
        </span>
      </span>

      <!-- Separator -->
      <span style="color: var(--text-muted);">|</span>

      <!-- Workflow name -->
      <span style="color: var(--text-secondary);">
        {{ workflowLabel }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useAnalysisStore } from "@/stores/analysis";

const store = useAnalysisStore();
const barRef = ref<HTMLElement | null>(null);

const workflowLabel = computed(() => {
  const map: Record<string, string> = {
    "bull-bear": "牛熊对抗 (Bull-Bear)",
    "quick-scan": "快速扫描 (Quick Scan)",
  };
  return map[store.workflow ?? ""] ?? store.workflow ?? "";
});
</script>
