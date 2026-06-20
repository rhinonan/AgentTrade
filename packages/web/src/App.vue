<template>
  <div class="app">
    <header class="app-header">
      <h1>AgentTrade</h1>
      <span class="subtitle">多Agent对抗行情分析</span>
    </header>
    <main class="app-main">
      <p>Loading...</p>
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f1117; color: #e1e4e8; }
.app { min-height: 100vh; display: flex; flex-direction: column; }
.app-header { padding: 16px 24px; background: #161b22; border-bottom: 1px solid #30363d; display: flex; align-items: baseline; gap: 12px; }
.app-header h1 { font-size: 20px; color: #58a6ff; }
.app-header .subtitle { font-size: 14px; color: #8b949e; }
.app-main { flex: 1; display: flex; }
</style>
