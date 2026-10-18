<script setup lang="ts">
import { ArrowDownRight, ArrowUpRight } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{ label: string; value: string; current: number; previous?: number | null; lowerIsBetter?: boolean }>()
const delta = computed(() => {
  if (props.previous == null || props.previous === 0) return null
  return (props.current - props.previous) / Math.abs(props.previous)
})
const good = computed(() => delta.value != null && (props.lowerIsBetter ? delta.value < 0 : delta.value > 0))
</script>

<template>
  <div class="kpi">
    <span class="l">{{ label }}</span>
    <span class="v num">{{ value }}</span>
    <span v-if="delta != null && Math.abs(delta) >= 0.005" class="d" :class="{ good, bad: !good }">
      <component :is="delta > 0 ? ArrowUpRight : ArrowDownRight" :size="14" />
      {{ Math.abs(delta * 100).toFixed(0) }}% к прошлому периоду
    </span>
    <span v-else-if="previous != null" class="d flat">как в прошлом периоде</span>
  </div>
</template>

<style scoped>
.kpi {
  display: grid;
  gap: 4px;
  align-content: start;
  padding: 16px;
  border-radius: var(--r-card);
  background: var(--surface);
}
.l {
  font-size: var(--fs-13);
  color: var(--ink-2);
  font-weight: 500;
}
.v {
  font-size: var(--fs-24);
  font-weight: 700;
}
.d {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--fs-11);
  font-weight: 600;
}
.good {
  color: var(--ok);
}
.bad {
  color: var(--danger);
}
.flat {
  color: var(--ink-3);
}
</style>
