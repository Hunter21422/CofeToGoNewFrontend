<script setup lang="ts">
withDefaults(defineProps<{ w?: string; h?: string; r?: string }>(), { w: '100%', h: '16px', r: '8px' })
</script>

<template>
  <span class="sk" :style="{ width: w, height: h, borderRadius: r }" aria-hidden="true" />
</template>

<style scoped>
.sk {
  display: block;
  background: linear-gradient(90deg, var(--surface-2) 0%, var(--surface-3) 50%, var(--surface-2) 100%);
  background-size: 200% 100%;
  animation: sh 1.3s ease-in-out infinite;
}
@keyframes sh {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
}
</style>
