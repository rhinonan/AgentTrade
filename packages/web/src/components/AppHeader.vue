<template>
  <header
    class="flex items-baseline gap-4 px-6 py-3.5 border-b relative"
    style="background: var(--glass-bg); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); border-color: var(--border-default);"
  >
    <!-- bottom glow bar -->
    <div class="absolute bottom-0 left-0 right-0 h-px" style="background: linear-gradient(90deg, transparent, var(--cyan), transparent); opacity: 0.4;"></div>
    <div class="flex items-baseline gap-2">
      <h1 class="text-xl font-bold" style="background: linear-gradient(90deg, var(--cyan), var(--teal)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 0.03em;">
        AgentTrade
      </h1>
      <span
        class="text-[10px] px-1.5 py-px rounded font-semibold uppercase tracking-wider"
        style="border: 1px solid var(--cyan); color: var(--cyan); animation: glow-pulse 2s ease-in-out infinite;"
      >ALPHA</span>
    </div>
    <span class="text-sm" style="color: var(--text-secondary);">多Agent对抗行情分析</span>
  </header>
</template>

<script setup lang="ts">
</script>
