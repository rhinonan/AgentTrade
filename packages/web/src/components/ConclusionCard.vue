<template>
  <div class="glass-panel-glow p-[18px] relative" style="overflow: hidden;">
    <!-- top glow accent -->
    <div
      class="absolute top-0 left-0 right-0 h-[3px]"
      style="background: linear-gradient(90deg, transparent, var(--cyan), transparent); opacity: 0.8;"
    ></div>
    <h3 class="text-[15px] font-semibold mb-3" style="color: var(--cyan); letter-spacing: 0.02em;">综合研判</h3>
    <div class="text-sm leading-relaxed whitespace-pre-wrap" style="color: var(--text-primary);">
      <p>{{ conclusion }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ conclusion: string }>();
</script>
