<script setup lang="ts">
/** Горизонтальные бары одной серии: значение у конца бара, подсказка при наведении. */
import { computed } from 'vue'

const props = defineProps<{ rows: { label: string; value: number; tip?: string }[]; format: (v: number) => string }>()
const max = computed(() => Math.max(...props.rows.map((r) => r.value), 1))
</script>

<template>
  <ol class="bl">
    <li v-for="r in rows" :key="r.label" class="row" :title="r.tip">
      <span class="lab">{{ r.label }}</span>
      <span class="track">
        <span class="bar" :style="{ width: Math.max(2, (r.value / max) * 100) + '%' }" />
        <span class="val num">{{ format(r.value) }}</span>
      </span>
      <span v-if="r.tip" class="tip">{{ r.tip }}</span>
    </li>
  </ol>
</template>

<style scoped>
.bl {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(110px, 38%) 1fr;
  gap: 12px;
  align-items: center;
  font-size: var(--fs-13);
}
.lab {
  color: var(--ink);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.track {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.bar {
  height: 14px;
  border-radius: 0 4px 4px 0;
  background: var(--chart);
}
.val {
  color: var(--ink-2);
  font-size: var(--fs-11);
  white-space: nowrap;
}
.tip {
  position: absolute;
  right: 0;
  top: -30px;
  padding: 5px 9px;
  border-radius: 8px;
  background: var(--ink);
  color: var(--paper);
  font-size: var(--fs-11);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s;
  z-index: 2;
}
.row:hover .tip {
  opacity: 1;
}
.row:hover .bar {
  filter: brightness(1.12);
}
</style>
