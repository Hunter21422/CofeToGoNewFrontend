<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'neutral' | 'info' | 'warn' | 'ok' | 'danger' | 'primary' | 'crema'; dot?: boolean }>(), {
  tone: 'neutral',
  dot: false,
})
</script>

<template>
  <span class="badge" :class="tone"><span v-if="dot" class="dot" /><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border-radius: var(--r-pill);
  font-size: var(--fs-13);
  font-weight: 600;
  white-space: nowrap;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.neutral {
  background: var(--surface-2);
  color: var(--ink-2);
}
.info {
  background: var(--info-soft);
  color: var(--info);
}
.warn {
  background: var(--warn-soft);
  color: var(--warn);
}
.ok {
  background: var(--ok-soft);
  color: var(--ok);
}
.danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.primary {
  background: var(--primary-soft);
  color: var(--primary);
}
.crema {
  background: var(--crema-soft);
  color: var(--crema-ink);
}
</style>
