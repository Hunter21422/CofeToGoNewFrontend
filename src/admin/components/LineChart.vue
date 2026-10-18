<script setup lang="ts">
/** Одна серия во времени: линия 2px, заливка-подложка, тонкая сетка, перекрестие + подсказка при наведении. */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  points: { x: string; y: number }[]
  formatY: (v: number) => string
  formatX: (iso: string) => string
  formatTip?: (iso: string) => string
  height?: number
}>()

const el = ref<HTMLElement | null>(null)
const w = ref(640)
const H = computed(() => props.height ?? 240)
const pad = { l: 56, r: 16, t: 16, b: 28 }
let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(([e]) => (w.value = Math.max(280, e.contentRect.width)))
  if (el.value) ro.observe(el.value)
})
onBeforeUnmount(() => ro?.disconnect())

function niceMax(v: number) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}
const maxY = computed(() => niceMax(Math.max(...props.points.map((p) => p.y), 0)))
const ticks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY.value))
const iw = computed(() => w.value - pad.l - pad.r)
const ih = computed(() => H.value - pad.t - pad.b)
const xs = (i: number) => pad.l + (props.points.length <= 1 ? iw.value / 2 : (i / (props.points.length - 1)) * iw.value)
const ys = (v: number) => pad.t + ih.value - (v / maxY.value) * ih.value

const line = computed(() => props.points.map((p, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(p.y).toFixed(1)}`).join(''))
const area = computed(() =>
  props.points.length ? `${line.value}L${xs(props.points.length - 1)},${pad.t + ih.value}L${xs(0)},${pad.t + ih.value}Z` : '',
)
const xLabels = computed(() => {
  const n = props.points.length
  const every = Math.max(1, Math.ceil(n / Math.floor(iw.value / 70)))
  return props.points.map((p, i) => ({ i, t: props.formatX(p.x) })).filter((_, i) => i % every === 0 || i === n - 1)
})
const peak = computed(() => props.points.reduce((b, p, i) => (p.y > (props.points[b]?.y ?? -1) ? i : b), 0))

const hover = ref<number | null>(null)
function onMove(e: PointerEvent) {
  const r = (e.currentTarget as SVGElement).getBoundingClientRect()
  const x = e.clientX - r.left
  const n = props.points.length
  if (!n) return
  const i = Math.round(((x - pad.l) / iw.value) * (n - 1))
  hover.value = Math.min(n - 1, Math.max(0, i))
}
</script>

<template>
  <div ref="el" class="lc">
    <svg :width="w" :height="H" role="img" aria-label="График выручки" @pointermove="onMove" @pointerleave="hover = null">
      <g class="grid">
        <g v-for="t in ticks" :key="t">
          <line :x1="pad.l" :x2="w - pad.r" :y1="ys(t)" :y2="ys(t)" />
          <text :x="pad.l - 8" :y="ys(t) + 4" text-anchor="end">{{ formatY(t) }}</text>
        </g>
        <text v-for="l in xLabels" :key="l.i" :x="xs(l.i)" :y="H - 8" text-anchor="middle">{{ l.t }}</text>
      </g>
      <path :d="area" class="area" />
      <path :d="line" class="line" />
      <!-- подпись пика — единственная прямая подпись на графике -->
      <g v-if="points.length && hover === null">
        <circle :cx="xs(peak)" :cy="ys(points[peak].y)" r="4.5" class="dot" />
        <text :x="xs(peak)" :y="ys(points[peak].y) - 12" text-anchor="middle" class="peak">{{ formatY(points[peak].y) }}</text>
      </g>
      <g v-if="hover !== null">
        <line :x1="xs(hover)" :x2="xs(hover)" :y1="pad.t" :y2="pad.t + ih" class="cross" />
        <circle :cx="xs(hover)" :cy="ys(points[hover].y)" r="5" class="dot" />
      </g>
    </svg>
    <div
      v-if="hover !== null"
      class="tip"
      :style="{ left: Math.min(Math.max(xs(hover), 80), w - 80) + 'px', top: Math.max(ys(points[hover].y) - 64, 0) + 'px' }"
    >
      <span class="tx">{{ (formatTip ?? formatX)(points[hover].x) }}</span>
      <span class="tv num">{{ formatY(points[hover].y) }}</span>
    </div>
  </div>
</template>

<style scoped>
.lc {
  position: relative;
  width: 100%;
}
svg {
  display: block;
  touch-action: pan-y;
}
.grid line {
  stroke: var(--grid);
  stroke-width: 1;
}
.grid text {
  fill: var(--ink-3);
  font-size: 11px;
  font-family: var(--font-body);
  font-variant-numeric: tabular-nums;
}
.area {
  fill: var(--chart-wash);
}
.line {
  fill: none;
  stroke: var(--chart);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.dot {
  fill: var(--chart);
  stroke: var(--surface);
  stroke-width: 2;
}
.peak {
  fill: var(--ink);
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-body);
}
.cross {
  stroke: var(--ink-3);
  stroke-width: 1;
}
.tip {
  position: absolute;
  transform: translateX(-50%);
  pointer-events: none;
  display: grid;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--ink);
  color: var(--paper);
  font-size: var(--fs-13);
  white-space: nowrap;
  box-shadow: 0 10px 24px -10px rgb(0 0 0 / 0.4);
}
.tx {
  opacity: 0.75;
  font-size: var(--fs-11);
}
.tv {
  font-weight: 700;
}
</style>
