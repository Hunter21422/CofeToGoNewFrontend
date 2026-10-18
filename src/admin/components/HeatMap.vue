<script setup lang="ts">
/** Дни недели × часы. Последовательная шкала одного оттенка: светлое — мало заказов, тёмное — много. */
import { computed, ref } from 'vue'
import type { HourHeatmapCell } from '@/shared/api/types'
import { WEEKDAYS, WEEKDAYS_FULL } from '@/shared/utils/format'

const props = defineProps<{ cells: HourHeatmapCell[]; from?: number; to?: number }>()
const hours = computed(() => Array.from({ length: (props.to ?? 22) - (props.from ?? 7) }, (_, i) => (props.from ?? 7) + i))
const map = computed(() => new Map(props.cells.map((c) => [`${c.weekday}-${c.hour}`, c.orders])))
const max = computed(() => Math.max(...props.cells.map((c) => c.orders), 1))
const STEPS = 5
const level = (v: number) => (v ? Math.min(STEPS, Math.ceil((v / max.value) * STEPS)) : 0)
const hover = ref<{ d: number; h: number; v: number } | null>(null)
</script>

<template>
  <div class="hm">
    <div class="grid" :style="{ gridTemplateColumns: `28px repeat(${hours.length}, 1fr)` }" @pointerleave="hover = null">
      <span />
      <span v-for="h in hours" :key="'h' + h" class="hl num">{{ h % 3 === 0 ? h : '' }}</span>
      <template v-for="(d, di) in WEEKDAYS" :key="d">
        <span class="dl">{{ d }}</span>
        <span
          v-for="h in hours"
          :key="d + h"
          class="cell"
          :class="'l' + level(map.get(`${di}-${h}`) ?? 0)"
          @pointerenter="hover = { d: di, h, v: map.get(`${di}-${h}`) ?? 0 }"
        />
      </template>
    </div>
    <p class="caption" aria-live="polite">
      <template v-if="hover">{{ WEEKDAYS_FULL[hover.d] }}, {{ hover.h }}:00–{{ hover.h + 1 }}:00 — {{ hover.v }} заказов</template>
      <template v-else>
        <span class="legend">
          мало <span v-for="i in STEPS" :key="i" class="sw" :class="'l' + i" /> много
        </span>
      </template>
    </p>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  gap: 2px;
}
.hl {
  font-size: 10px;
  color: var(--ink-3);
  text-align: left;
}
.dl {
  font-size: var(--fs-11);
  color: var(--ink-3);
  display: flex;
  align-items: center;
}
.cell {
  aspect-ratio: 1;
  min-height: 14px;
  border-radius: 3px;
}
.cell:hover {
  outline: 2px solid var(--ink);
  outline-offset: 0;
}
.l0 {
  background: var(--surface-2);
}
.l1 {
  background: color-mix(in oklab, var(--chart) 18%, var(--surface));
}
.l2 {
  background: color-mix(in oklab, var(--chart) 36%, var(--surface));
}
.l3 {
  background: color-mix(in oklab, var(--chart) 56%, var(--surface));
}
.l4 {
  background: color-mix(in oklab, var(--chart) 78%, var(--surface));
}
.l5 {
  background: color-mix(in oklab, var(--chart) 80%, var(--ink));
}
.caption {
  margin-top: 10px;
  font-size: var(--fs-13);
  color: var(--ink-2);
  min-height: 1.5em;
}
.legend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--ink-3);
  font-size: var(--fs-11);
}
.sw {
  width: 14px;
  height: 14px;
  border-radius: 3px;
}
</style>
