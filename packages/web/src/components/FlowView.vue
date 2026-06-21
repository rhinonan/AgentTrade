<template>
  <div class="p-6 flex flex-col flex-1">
    <!-- 流程条：轻量，无玻璃包裹 -->
    <StepProgress :steps="store.steps" />

    <!-- 分隔线：流程 → 日志 -->
    <div class="divider-cyan my-6"></div>

    <!-- 日志区：玻璃包裹 -->
    <div class="glass-panel p-5">
      <LiveLog :logs="store.logs" :is-running="store.isRunning" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAnalysisStore } from "@/stores/analysis";
import StepProgress from "./StepProgress.vue";
import LiveLog from "./LiveLog.vue";

const store = useAnalysisStore();
</script>
