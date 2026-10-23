<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { plural } from '../utils/format'

const props = withDefaults(
  defineProps<{
    stamps: number
    perGift?: number
    gifts?: number
    compact?: boolean
    title?: string | null
  }>(),
  { perGift: 5, gifts: 0, compact: false, title: null },
)

// Слоты: perGift штампов + последний — подарочная чашка
const slots = computed(() => Array.from({ length: props.perGift }, (_, i) => i < props.stamps))
// Детерминированный «ручной» поворот каждого штампа
const tilt = (i: number) => [-14, 9, -4, 16, -10, 6, -18, 12][i % 8]

const justStamped = ref<number | null>(null)
watch(
  () => props.stamps,
  (n, old) => {
    if (old !== undefined && n > old) {
      justStamped.value = n - 1
      setTimeout(() => (justStamped.value = null), 900)
    }
  },
)

const headline = computed(() => {
  if (props.title) return props.title
  const left = props.perGift - props.stamps
  if (props.gifts > 0 && props.stamps === 0) return 'Напиток в подарок ждёт вас'
  if (left <= 0) return 'Следующий напиток — подарок'
  return `Ещё ${left} ${plural(left, 'напиток', 'напитка', 'напитков')} до подарка`
})
const uid = `sc${Math.random().toString(36).slice(2, 7)}`
</script>

<template>
  <section class="card" :class="{ compact }" :aria-label="`Штампов ${stamps} из ${perGift}. Подарков: ${gifts}`">
    <svg width="0" height="0" class="defs" aria-hidden="true">
      <filter :id="uid + 'ink'" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feComponentTransfer in="n" result="mask"><feFuncA type="discrete" tableValues="0.72 0.9 1 1 1 0.85" /></feComponentTransfer>
        <feComposite in="d" in2="mask" operator="in" />
      </filter>
    </svg>

    <header class="head">
      <h2 class="headline">{{ headline }}</h2>
      <p v-if="!compact" class="sub">Штамп — за каждый заказ с напитком, сколько бы их ни было. {{ perGift + 1 }}-й заказ — напиток в подарок.</p>
    </header>

    <div class="row" role="list">
      <div v-for="(filled, i) in slots" :key="i" class="slot" role="listitem" :aria-label="filled ? 'Штамп' : 'Пусто'">
        <svg
          v-if="filled"
          viewBox="0 0 48 48"
          class="stamp"
          :class="{ thunk: justStamped === i }"
          :style="{ transform: `rotate(${tilt(i)}deg)` }"
          :filter="`url(#${uid}ink)`"
        >
          <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="2.6" />
          <circle cx="24" cy="24" r="16.5" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2.4" />
          <ellipse cx="24" cy="24" rx="7.6" ry="10.4" fill="currentColor" transform="rotate(-28 24 24)" />
          <path d="M20.6 15.6c4.6 4 0.4 12.4 6.4 16.8" stroke="var(--card)" stroke-width="2" fill="none" stroke-linecap="round" />
        </svg>
        <span v-else class="hole" />
      </div>

      <div class="tear" aria-hidden="true" />

      <div class="slot gift" :class="{ ready: gifts > 0 }" role="listitem" aria-label="Подарок">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M12 18h22l-2.4 19a3 3 0 0 1-3 2.6H17.4a3 3 0 0 1-3-2.6z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
          <path d="M34 22h2.6a4.4 4.4 0 0 1 0 8.8H33" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M10 18h26" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
          <path d="M19 8c-2 2.4 2 3.6 0 6.4M25 8c-2 2.4 2 3.6 0 6.4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" />
        </svg>
        <span v-if="gifts > 0" class="gift-count num">{{ gifts }}</span>
      </div>
    </div>

    <footer v-if="gifts > 0" class="foot">
      <span class="chip">
        {{ gifts }} {{ plural(gifts, 'подарок', 'подарка', 'подарков') }} на счету — выберите при оформлении или покажите QR на кассе
      </span>
    </footer>
    <slot />
  </section>
</template>

<style scoped>
.card {
  --card: #1f4d3a;
  --card-ink: #f3f6f1;
  --card-hole: #173b2c;
  position: relative;
  padding: 20px 20px 18px;
  border-radius: var(--r-card);
  background:
    radial-gradient(circle at 0 62%, var(--paper) 0 9px, transparent 9.5px),
    radial-gradient(circle at 100% 62%, var(--paper) 0 9px, transparent 9.5px),
    var(--card);
  color: var(--card-ink);
  overflow: hidden;
  isolation: isolate;
}
:root[data-theme='dark'] .card {
  --card: #1c3d2e;
  --card-hole: #143023;
}
/* фактура картона */
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0.22;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: soft-light;
}
.defs {
  position: absolute;
}
.head {
  display: grid;
  gap: 6px;
  margin-bottom: 18px;
}
.headline {
  font-size: var(--fs-20);
  font-weight: 600;
  max-width: 22ch;
}
.sub {
  font-size: var(--fs-13);
  opacity: 0.72;
  max-width: 36ch;
}
.row {
  display: grid;
  grid-template-columns: repeat(var(--n, 5), 1fr) 10px 1.15fr;
  align-items: center;
  gap: 8px;
}
.row {
  --n: v-bind('perGift');
}
.slot {
  position: relative;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
}
.hole {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--card-hole);
  box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.35), 0 1px 0 rgb(255 255 255 / 0.06);
}
.stamp {
  width: 108%;
  height: 108%;
  color: #e5533f;
  mix-blend-mode: screen;
}
.stamp.thunk {
  animation: thunk 0.62s var(--ease) both;
}
@keyframes thunk {
  0% {
    opacity: 0;
    scale: 1.9;
  }
  55% {
    opacity: 1;
    scale: 0.92;
  }
  100% {
    scale: 1;
  }
}
.tear {
  align-self: stretch;
  justify-self: center;
  width: 0;
  border-left: 2px dashed rgb(255 255 255 / 0.26);
  margin: -6px 0;
}
.gift {
  color: var(--crema);
  border-radius: 50%;
  border: 2px dashed rgb(226 183 112 / 0.45);
}
.gift svg {
  width: 72%;
}
.gift.ready {
  border-style: solid;
  border-color: var(--crema);
  background: rgb(226 183 112 / 0.14);
}
.gift-count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border-radius: var(--r-pill);
  background: var(--crema);
  color: #3b2a0c;
  font-size: var(--fs-11);
  display: grid;
  place-items: center;
}
.foot {
  margin-top: 16px;
}
.chip {
  display: inline-block;
  font-size: var(--fs-13);
  line-height: 1.35;
  color: #f6e6c6;
}
.compact {
  padding: 16px;
}
.compact .head {
  margin-bottom: 14px;
}
.compact .headline {
  font-size: var(--fs-17);
}
</style>
