<script setup lang="ts">
/**
 * Иллюстрация товара: вид сверху на чашку / стакан / тарелку.
 * Если у товара есть image_url — показываем фото, иначе рисуем по slug.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{ slug: string; imageUrl?: string | null; size?: number; tile?: boolean }>(), {
  imageUrl: null,
  size: 120,
  tile: true,
})

type Kind = 'cup' | 'small' | 'glass' | 'juice' | 'shake' | 'croissant' | 'cinnabon' | 'cake' | 'square' | 'macaron' | 'plate' | 'bowl'
type Art = 'none' | 'heart' | 'tulip' | 'rosetta' | 'ring' | 'specks' | 'swirl' | 'marsh' | 'leaf'
interface Spec {
  kind: Kind
  liquid?: string
  foam?: string
  art?: Art
  tone: string // фон плитки
  extra?: string
  fill?: string // начинка / верх десерта
  crust?: string
  style?: 'tiramisu' | 'brownie'
}

const SPECS: Record<string, Spec> = {
  espresso: { kind: 'small', liquid: '#5a3216', foam: '#a8682f', art: 'ring', tone: '#e9dccb' },
  americano: { kind: 'cup', liquid: '#3b220f', foam: '#6b3d1c', art: 'ring', tone: '#e4d9cc' },
  cappuccino: { kind: 'cup', liquid: '#8a5428', foam: '#f3e6d2', art: 'heart', tone: '#efe1cf' },
  'flat-white': { kind: 'cup', liquid: '#7a4620', foam: '#ecd9bf', art: 'tulip', tone: '#eadbc6' },
  latte: { kind: 'cup', liquid: '#a46a37', foam: '#f6ead9', art: 'rosetta', tone: '#f1e5d5' },
  raf: { kind: 'cup', liquid: '#e9d5b5', foam: '#f8eedf', art: 'specks', tone: '#f4ead8' },
  'raf-lavender': { kind: 'cup', liquid: '#c9b6dd', foam: '#efe6f6', art: 'specks', tone: '#e6dcef', extra: '#8f74b5' },
  mocha: { kind: 'cup', liquid: '#5b311a', foam: '#c99d78', art: 'swirl', tone: '#e7d6c6' },
  cortado: { kind: 'small', liquid: '#9a5f2e', foam: '#e8d2b4', art: 'heart', tone: '#ecdccb' },
  cocoa: { kind: 'cup', liquid: '#7b4527', foam: '#a3694a', art: 'marsh', tone: '#ead8ca' },
  matcha: { kind: 'cup', liquid: '#7da35a', foam: '#d7e6bf', art: 'heart', tone: '#dfe8d0' },
  'hot-chocolate': { kind: 'small', liquid: '#3d1d0e', foam: '#5e2f17', art: 'swirl', tone: '#e3d2c4' },
  'iced-latte': { kind: 'glass', liquid: '#c99b6b', foam: '#efe0cc', tone: '#e3e6df' },
  'espresso-tonic': { kind: 'glass', liquid: '#c98a3a', foam: '#6a3a15', tone: '#e6e3d7' },
  'cold-brew': { kind: 'glass', liquid: '#3a2111', foam: '#5a3418', tone: '#dfe1db' },
  lemonade: { kind: 'glass', liquid: '#f2a43a', foam: '#f7c56e', tone: '#f3e6cf', extra: '#5f8a4c' },
  'tea-pot': { kind: 'cup', liquid: '#b5651d', foam: '#c97a2e', art: 'leaf', tone: '#ece0cf' },
  'tea-black': { kind: 'cup', liquid: '#9a4a12', foam: '#b8621f', art: 'leaf', tone: '#ece0cf' },
  'tea-green': { kind: 'cup', liquid: '#b7b04a', foam: '#cfc76a', art: 'leaf', tone: '#e7e8d2' },
  masala: { kind: 'cup', liquid: '#c58a55', foam: '#e7c9a4', art: 'specks', tone: '#efe0cd', extra: '#6b3a16' },
  'lemonade-strawberry': { kind: 'glass', liquid: '#e2546a', foam: '#f39aa6', tone: '#f4dfe0', extra: '#4f8a3c' },
  'lemonade-mango': { kind: 'glass', liquid: '#f3a12b', foam: '#f9c95e', tone: '#f6e6c8', extra: '#5f8a4c' },
  'lemonade-citrus': { kind: 'glass', liquid: '#e7d84f', foam: '#f4ec9a', tone: '#eef0d4', extra: '#3f8a4a' },
  'juice-orange': { kind: 'juice', liquid: '#f39324', foam: '#f7b24e', tone: '#f7e5cc', extra: '#f6a531' },
  'juice-apple': { kind: 'juice', liquid: '#d8c25a', foam: '#e8d982', tone: '#eef0d2', extra: '#8cc152' },
  'juice-grapefruit': { kind: 'juice', liquid: '#ec6f5c', foam: '#f39a86', tone: '#f6dfd8', extra: '#f08a73' },
  'juice-carrot': { kind: 'juice', liquid: '#ee7a22', foam: '#f39c4e', tone: '#f6e1cc', extra: '#e8a23b' },
  'shake-vanilla': { kind: 'shake', liquid: '#f3e3bf', foam: '#fffaf0', tone: '#f5ecd8', extra: '#c9a25a' },
  'shake-chocolate': { kind: 'shake', liquid: '#7a4a2a', foam: '#fff6ea', tone: '#ead9cb', extra: '#3e2111' },
  'shake-strawberry': { kind: 'shake', liquid: '#f1a3b0', foam: '#fff5f6', tone: '#f6e0e3', extra: '#d2412f' },
  'shake-banana': { kind: 'shake', liquid: '#f2d67a', foam: '#fffbea', tone: '#f6ecd0', extra: '#8a5a2b' },
  tiramisu: { kind: 'square', tone: '#eee2d2', style: 'tiramisu' },
  brownie: { kind: 'square', tone: '#e8dacc', style: 'brownie' },
  medovik: { kind: 'cake', tone: '#f1e3c9', fill: '#e8b15c', crust: '#b8742c' },
  macarons: { kind: 'macaron', tone: '#efe4e6' },
  'sea-buckthorn': { kind: 'cup', liquid: '#ef8a1e', foam: '#f6b04f', art: 'specks', tone: '#f4e3cc', extra: '#c4580c' },
  croissant: { kind: 'croissant', tone: '#f2e3c7' },
  'almond-croissant': { kind: 'croissant', tone: '#efe0c8', extra: 'almond' },
  cinnabon: { kind: 'cinnabon', tone: '#f0e2cf' },
  cheesecake: { kind: 'cake', tone: '#f3ead6' },
  syrniki: { kind: 'plate', tone: '#efe4d3' },
  granola: { kind: 'bowl', tone: '#e9e4d6' },
}

const spec = computed<Spec>(() => SPECS[props.slug] ?? { kind: 'cup', liquid: '#8a5428', foam: '#efe0cc', art: 'heart', tone: '#ece2d4' })
const showImage = computed(() => props.imageUrl && !props.imageUrl.startsWith('art:'))
const uid = `pa${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <div class="art" :class="{ tile }" :style="{ '--tone': spec.tone, width: size + 'px', height: size + 'px' }" aria-hidden="true">
    <img v-if="showImage" :src="imageUrl!" alt="" loading="lazy" />
    <svg v-else viewBox="0 0 120 120">
      <defs>
        <radialGradient :id="uid + 'l'" cx="45%" cy="40%" r="65%">
          <stop offset="0%" :stop-color="spec.foam ?? '#fff'" stop-opacity="0.35" />
          <stop offset="100%" :stop-color="spec.liquid ?? '#000'" stop-opacity="0" />
        </radialGradient>
        <filter :id="uid + 's'" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#1b140c" flood-opacity="0.16" />
        </filter>
      </defs>

      <!-- Чашка с блюдцем -->
      <g v-if="spec.kind === 'cup' || spec.kind === 'small'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="61" :r="spec.kind === 'small' ? 42 : 52" class="saucer" />
        <rect :x="spec.kind === 'small' ? 78 : 86" y="54" :width="spec.kind === 'small' ? 15 : 19" height="12" rx="6" class="rim" />
        <circle cx="58" cy="60" :r="spec.kind === 'small' ? 26 : 36" class="rim" />
        <circle cx="58" cy="60" :r="spec.kind === 'small' ? 21.5 : 31" :fill="spec.liquid" />
        <circle cx="58" cy="60" :r="spec.kind === 'small' ? 21.5 : 31" :fill="`url(#${uid}l)`" />

        <template v-if="spec.art === 'ring'">
          <circle cx="58" cy="60" :r="spec.kind === 'small' ? 17 : 25" fill="none" :stroke="spec.foam" stroke-width="5" opacity="0.65" />
          <circle cx="52" cy="54" r="3" :fill="spec.foam" opacity="0.5" />
        </template>
        <template v-else-if="spec.art === 'heart'">
          <circle cx="58" cy="60" :r="spec.kind === 'small' ? 16 : 24" :fill="spec.foam" />
          <path
            :transform="spec.kind === 'small' ? 'translate(58 60) scale(0.62) translate(-58 -60)' : ''"
            d="M58 75c-15-9-17-21-10-25 4-2.4 8-0.6 10 3.4 2-4 6-5.8 10-3.4 7 4 5 16-10 25z"
            :fill="spec.liquid"
          />
        </template>
        <template v-else-if="spec.art === 'tulip'">
          <circle cx="58" cy="60" r="24" :fill="spec.foam" />
          <path d="M58 78c-9-4-11-10-6-13 2.4-1.4 4.6-.4 6 1.6 1.4-2 3.6-3 6-1.6 5 3 3 9-6 13z" :fill="spec.liquid" />
          <path d="M58 66c-9-4-11-10-6-13 2.4-1.4 4.6-.4 6 1.6 1.4-2 3.6-3 6-1.6 5 3 3 9-6 13z" :fill="spec.liquid" />
          <path d="M58 54c-7-3-8.5-8-4.5-10 2-1 3.5-.3 4.5 1.2 1-1.5 2.5-2.2 4.5-1.2 4 2 2.5 7-4.5 10z" :fill="spec.liquid" />
          <path d="M58 44v36" :stroke="spec.liquid" stroke-width="1.6" />
        </template>
        <template v-else-if="spec.art === 'rosetta'">
          <circle cx="58" cy="60" r="25" :fill="spec.foam" />
          <g fill="none" :stroke="spec.liquid" stroke-linecap="round">
            <path d="M44 74q14 8 28 0" stroke-width="4" />
            <path d="M45.5 67q12.5 7 25 0" stroke-width="3.6" />
            <path d="M47 60q11 6 22 0" stroke-width="3.2" />
            <path d="M49 53.5q9 5 18 0" stroke-width="2.8" />
            <path d="M51.5 47.5q6.5 3.5 13 0" stroke-width="2.4" />
            <path d="M58 42v38" stroke-width="1.6" />
          </g>
        </template>
        <template v-else-if="spec.art === 'specks'">
          <circle cx="58" cy="60" r="27" :fill="spec.foam" opacity="0.55" />
          <g :fill="spec.extra ?? '#2d1a0c'" opacity="0.75">
            <circle cx="50" cy="52" r="1.2" /><circle cx="63" cy="49" r="1" /><circle cx="68" cy="62" r="1.3" />
            <circle cx="55" cy="68" r="1" /><circle cx="47" cy="63" r="0.9" /><circle cx="60" cy="58" r="1.1" />
            <circle cx="66" cy="71" r="0.9" /><circle cx="52" cy="76" r="1" /><circle cx="72" cy="54" r="0.8" />
          </g>
        </template>
        <template v-else-if="spec.art === 'swirl'">
          <path
            d="M58 60m-2 0a2 2 0 1 1 4 0a6 6 0 1 1-12 0a10 10 0 1 1 20 0a14 14 0 1 1-28 0a18 18 0 1 1 36 0"
            fill="none"
            :stroke="spec.foam"
            stroke-width="2.6"
            stroke-linecap="round"
            opacity="0.85"
          />
        </template>
        <template v-else-if="spec.art === 'marsh'">
          <g fill="#fbf6ee" stroke="#e7d7c4" stroke-width="0.8">
            <rect x="44" y="48" width="10" height="10" rx="3" transform="rotate(-14 49 53)" />
            <rect x="60" y="45" width="10" height="10" rx="3" transform="rotate(18 65 50)" />
            <rect x="55" y="60" width="10" height="10" rx="3" transform="rotate(6 60 65)" />
            <rect x="68" y="62" width="9" height="9" rx="3" transform="rotate(-20 72 66)" />
            <rect x="43" y="64" width="9" height="9" rx="3" transform="rotate(24 47 68)" />
          </g>
        </template>
        <template v-else-if="spec.art === 'leaf'">
          <path d="M48 68c4-14 16-20 24-18-2 10-12 20-24 18z" fill="#7aa35a" opacity="0.9" />
          <path d="M50 66c6-5 12-9 19-13" stroke="#4f7a39" stroke-width="1.2" fill="none" />
        </template>
      </g>

      <!-- Стакан со льдом, вид сверху -->
      <g v-else-if="spec.kind === 'glass'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="44" class="glass" />
        <circle cx="60" cy="60" r="38" :fill="spec.liquid" />
        <circle cx="60" cy="60" r="38" :fill="spec.foam" opacity="0.35" />
        <g fill="#ffffff" fill-opacity="0.62" stroke="#ffffff" stroke-opacity="0.9" stroke-width="1">
          <rect x="38" y="40" width="20" height="20" rx="5" transform="rotate(-12 48 50)" />
          <rect x="62" y="38" width="18" height="18" rx="5" transform="rotate(16 71 47)" />
          <rect x="52" y="62" width="19" height="19" rx="5" transform="rotate(8 61 71)" />
          <rect x="35" y="62" width="14" height="14" rx="4" transform="rotate(-24 42 69)" />
        </g>
        <template v-if="spec.extra">
          <path d="M70 70c6-8 12-10 16-9" :stroke="spec.extra" stroke-width="1.4" fill="none" />
          <g :fill="spec.extra">
            <ellipse cx="76" cy="66" rx="2" ry="4.5" transform="rotate(40 76 66)" />
            <ellipse cx="81" cy="63" rx="2" ry="4.5" transform="rotate(60 81 63)" />
            <ellipse cx="72" cy="71" rx="2" ry="4.5" transform="rotate(20 72 71)" />
          </g>
        </template>
        <circle cx="77" cy="74" r="6" fill="var(--stamp)" />
        <circle cx="77" cy="74" r="3.2" :fill="spec.liquid" opacity="0.8" />
        <path d="M30 44a36 36 0 0 1 22-18" stroke="#fff" stroke-opacity="0.7" stroke-width="3" fill="none" stroke-linecap="round" />
      </g>

      <!-- Круассан -->
      <g v-else-if="spec.kind === 'croissant'" :filter="`url(#${uid}s)`" transform="rotate(-18 60 60)">
        <ellipse cx="60" cy="64" rx="14" ry="20" fill="#d99a45" />
        <ellipse cx="42" cy="62" rx="11" ry="16" fill="#e2a957" transform="rotate(-28 42 62)" />
        <ellipse cx="78" cy="62" rx="11" ry="16" fill="#e2a957" transform="rotate(28 78 62)" />
        <ellipse cx="28" cy="55" rx="8" ry="12" fill="#e9b867" transform="rotate(-48 28 55)" />
        <ellipse cx="92" cy="55" rx="8" ry="12" fill="#e9b867" transform="rotate(48 92 55)" />
        <g stroke="#a8692a" stroke-width="1.4" fill="none" opacity="0.7" stroke-linecap="round">
          <path d="M52 50q8 6 16 0" /><path d="M50 62q10 7 20 0" /><path d="M52 74q8 6 16 0" />
          <path d="M37 54q4 6 10 7" /><path d="M83 54q-4 6-10 7" />
        </g>
        <ellipse cx="56" cy="56" rx="4" ry="7" fill="#fff" opacity="0.22" />
        <g v-if="spec.extra === 'almond'" fill="#f7ecd8" stroke="#dcc39b" stroke-width="0.6">
          <ellipse cx="54" cy="58" rx="2.4" ry="4" transform="rotate(30 54 58)" />
          <ellipse cx="63" cy="66" rx="2.4" ry="4" transform="rotate(-20 63 66)" />
          <ellipse cx="45" cy="64" rx="2.2" ry="3.6" transform="rotate(70 45 64)" />
          <ellipse cx="73" cy="58" rx="2.2" ry="3.6" transform="rotate(-60 73 58)" />
          <ellipse cx="60" cy="74" rx="2.2" ry="3.6" transform="rotate(10 60 74)" />
        </g>
        <g v-if="spec.extra === 'almond'" fill="#fff" opacity="0.8">
          <circle cx="50" cy="70" r="0.9" /><circle cx="66" cy="54" r="0.8" /><circle cx="70" cy="72" r="0.9" /><circle cx="40" cy="58" r="0.8" />
        </g>
      </g>

      <!-- Синнабон -->
      <g v-else-if="spec.kind === 'cinnabon'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="46" class="saucer" />
        <circle cx="60" cy="60" r="32" fill="#d8a066" />
        <path
          d="M60 60m-2 0a2 2 0 1 1 4 0a7 7 0 1 1-14 0a12 12 0 1 1 24 0a17 17 0 1 1-34 0a22 22 0 1 1 44 0"
          fill="none"
          stroke="#8b4f22"
          stroke-width="3"
          stroke-linecap="round"
        />
        <path d="M40 52c6-6 10 2 16-4s10 4 16-2 8 6 10 10c-4 8-12 4-18 9s-12-1-18 3-10-6-6-16z" fill="#fbf4e8" opacity="0.88" />
      </g>

      <!-- Чизкейк -->
      <g v-else-if="spec.kind === 'cake'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="46" class="saucer" />
        <path d="M34 78L60 28l26 50z" :fill="spec.fill ?? '#f4e2b8'" stroke="rgb(0 0 0 / 0.08)" stroke-width="1" stroke-linejoin="round" />
        <path d="M34 78h52l-4 6H38z" :fill="spec.crust ?? '#c48a4a'" />
        <template v-if="slug === 'medovik'">
          <g fill="#c9853a" opacity="0.6"><circle cx="55" cy="55" r="1.4" /><circle cx="62" cy="62" r="1.2" /><circle cx="58" cy="70" r="1.5" /><circle cx="66" cy="72" r="1.1" /><circle cx="52" cy="66" r="1" /></g>
          <path d="M46 70h28M50 62h20M54 54h12" stroke="#f5d9a6" stroke-width="1.4" />
        </template>
        <template v-else>
          <path d="M52 52c4 3 12 3 16 0" stroke="#e3c58b" stroke-width="1.2" fill="none" />
          <circle cx="66" cy="66" r="4.5" fill="var(--stamp)" />
          <path d="M66 61.5c1-2 3-2.5 4-2" stroke="#4f7a39" stroke-width="1.4" fill="none" />
        </template>
      </g>

      <!-- Сок: стакан без льда, долька на краю -->
      <g v-else-if="spec.kind === 'juice'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="42" class="glass" />
        <circle cx="60" cy="60" r="36" :fill="spec.liquid" />
        <circle cx="54" cy="54" r="24" :fill="spec.foam" opacity="0.45" />
        <g :fill="spec.foam" opacity="0.9"><circle cx="48" cy="66" r="1.4" /><circle cx="62" cy="48" r="1.2" /><circle cx="70" cy="64" r="1.5" /><circle cx="56" cy="74" r="1.1" /><circle cx="44" cy="52" r="1" /></g>
        <g transform="rotate(-30 88 34)">
          <circle cx="88" cy="34" r="15" :fill="spec.extra" />
          <circle cx="88" cy="34" r="12" fill="#fff6dc" opacity="0.55" />
          <g stroke="#fff" stroke-width="1.4" opacity="0.85"><path d="M88 22v24M76 34h24M80 26l16 16M96 26l-16 16" /></g>
        </g>
        <circle cx="38" cy="78" r="5" fill="var(--stamp)" /><circle cx="38" cy="78" r="2.6" :fill="spec.liquid" />
      </g>

      <!-- Молочный коктейль: сливки, трубочка, посыпка -->
      <g v-else-if="spec.kind === 'shake'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="44" class="glass" />
        <circle cx="60" cy="60" r="38" :fill="spec.liquid" />
        <path
          d="M60 60m-4 0a4 4 0 1 1 8 0a9 9 0 1 1-18 0a14 14 0 1 1 28 0a19 19 0 1 1-38 0"
          fill="none" :stroke="spec.foam" stroke-width="7" stroke-linecap="round"
        />
        <circle cx="60" cy="60" r="5" :fill="spec.foam" />
        <g :fill="spec.extra">
          <rect x="49" y="47" width="5" height="1.8" rx="0.9" transform="rotate(30 51 48)" /><rect x="66" y="52" width="5" height="1.8" rx="0.9" transform="rotate(-20 68 53)" />
          <rect x="56" y="70" width="5" height="1.8" rx="0.9" transform="rotate(70 58 71)" /><rect x="44" y="62" width="5" height="1.8" rx="0.9" transform="rotate(-50 46 63)" />
          <rect x="70" y="66" width="5" height="1.8" rx="0.9" transform="rotate(10 72 67)" />
        </g>
        <circle cx="80" cy="40" r="6" fill="var(--stamp)" /><circle cx="80" cy="40" r="3.2" fill="#fff" opacity="0.85" />
      </g>

      <!-- Тирамису / брауни: квадратный кусок -->
      <g v-else-if="spec.kind === 'square'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="46" class="saucer" />
        <g transform="rotate(-10 60 60)">
          <rect x="34" y="34" width="52" height="52" rx="6" :fill="spec.style === 'brownie' ? '#4a2614' : '#e9d6b6'" />
          <template v-if="spec.style === 'tiramisu'">
            <rect x="34" y="34" width="52" height="52" rx="6" fill="#8a5a36" opacity="0.85" />
            <g fill="#5a341c" opacity="0.7"><circle cx="44" cy="46" r="1.6" /><circle cx="58" cy="42" r="1.2" /><circle cx="72" cy="50" r="1.8" /><circle cx="50" cy="64" r="1.3" /><circle cx="66" cy="70" r="1.6" /><circle cx="76" cy="62" r="1" /><circle cx="42" cy="76" r="1.2" /></g>
            <path d="M46 56c6-6 12 2 18-4s10 2 12 0" stroke="#c49a6c" stroke-width="1.6" fill="none" opacity="0.7" />
          </template>
          <template v-else>
            <path d="M40 48l10 4 6-6 10 8 10-4M42 66l8-4 8 6 10-6 8 4" stroke="#6e3a1d" stroke-width="1.8" fill="none" />
            <g fill="#c9a06a"><ellipse cx="50" cy="58" rx="4" ry="3" /><ellipse cx="70" cy="74" rx="3.5" ry="2.6" /><ellipse cx="72" cy="44" rx="3" ry="2.4" /></g>
          </template>
        </g>
      </g>

      <!-- Макаронс -->
      <g v-else-if="spec.kind === 'macaron'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="48" class="saucer" />
        <g v-for="(m, i) in [{ x: 44, y: 50, c: '#a8c97a' }, { x: 74, y: 52, c: '#e98aa0' }, { x: 58, y: 76, c: '#d9a35a' }]" :key="i">
          <circle :cx="m.x" :cy="m.y" r="15" :fill="m.c" />
          <circle :cx="m.x" :cy="m.y" r="15" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="2 2" />
          <circle :cx="m.x - 4" :cy="m.y - 4" r="4" fill="#fff" opacity="0.25" />
        </g>
      </g>

      <!-- Сырники -->
      <g v-else-if="spec.kind === 'plate'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="50" class="saucer" />
        <circle cx="60" cy="60" r="40" class="rim" />
        <g fill="#d99848" stroke="#b67530" stroke-width="1">
          <circle cx="46" cy="52" r="13" /><circle cx="70" cy="50" r="13" /><circle cx="58" cy="72" r="13" />
        </g>
        <g fill="#f0c27a" opacity="0.8"><circle cx="43" cy="49" r="5" /><circle cx="67" cy="47" r="5" /><circle cx="55" cy="69" r="5" /></g>
        <path d="M76 66c6 0 10 4 8 8s-10 6-14 2 0-10 6-10z" fill="#fbf6ee" />
        <path d="M34 70c4-2 9 0 9 4s-6 6-9 4-3-6 0-8z" fill="#b83a3a" />
      </g>

      <!-- Гранола -->
      <g v-else-if="spec.kind === 'bowl'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="46" class="rim" />
        <circle cx="60" cy="60" r="38" fill="#f8f4ec" />
        <g fill="#c58b45"><circle cx="48" cy="50" r="5" /><circle cx="56" cy="46" r="4" /><circle cx="66" cy="52" r="5.5" /><circle cx="52" cy="58" r="4.5" /><circle cx="62" cy="62" r="4" /><circle cx="44" cy="62" r="3.5" /></g>
        <g fill="#9e6630" opacity="0.7"><circle cx="60" cy="50" r="2.5" /><circle cx="47" cy="56" r="2.2" /><circle cx="68" cy="58" r="2.4" /></g>
        <g fill="#b9364a"><circle cx="70" cy="70" r="5" /><circle cx="58" cy="76" r="4.5" /></g>
        <g fill="#3e4f8f"><circle cx="76" cy="62" r="4" /><circle cx="48" cy="72" r="3.6" /><circle cx="64" cy="78" r="3.2" /></g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.art {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.art.tile {
  background: color-mix(in oklab, var(--tone) 78%, var(--surface));
  border-radius: var(--r-tile);
}
:root[data-theme='dark'] .art.tile {
  background: color-mix(in oklab, var(--tone) 16%, var(--surface-2));
}
.art svg {
  width: 88%;
  height: 88%;
}
.art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.saucer {
  fill: #fbfbf8;
  stroke: rgb(0 0 0 / 0.06);
}
.rim {
  fill: #ffffff;
  stroke: rgb(0 0 0 / 0.07);
}
.glass {
  fill: rgb(255 255 255 / 0.55);
  stroke: rgb(255 255 255 / 0.9);
  stroke-width: 2;
}
:root[data-theme='dark'] .saucer {
  fill: #e9ece6;
}
:root[data-theme='dark'] .rim {
  fill: #f4f5f2;
}
</style>
