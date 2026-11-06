<script setup lang="ts">
import { computed } from 'vue'
import { DOCS, docBlocks, useLegal, type DocKey } from '../legal/docs'

const props = defineProps<{ doc: string }>()
const key = computed(() => (props.doc in DOCS ? (props.doc as DocKey) : 'policy'))
const { legal } = useLegal()
const blocks = computed(() => (legal.value ? docBlocks(key.value, legal.value) : []))

function rich(text: string) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
}
</script>

<template>
  <main class="screen no-tabs lg">
    <h1 class="page-title">{{ DOCS[key] }}</h1>
    <nav class="docs">
      <RouterLink v-for="(t, k) in DOCS" :key="k" :to="`/legal/${k}`" class="chip" :class="{ on: k === key }" replace>{{ t }}</RouterLink>
    </nav>
    <p v-if="!legal" class="muted">Загружаем…</p>
    <article v-else class="doc">
      <template v-for="(b, i) in blocks" :key="i">
        <p v-if="b[0] === 'subtitle'" class="sub" v-html="rich(String(b[1]))" />
        <p v-else-if="b[0] === 'place'" class="date" v-html="rich(String(b[1]))" />
        <h2 v-else-if="b[0] === 'h'" class="h" v-html="rich(String(b[1]))" />
        <p v-else-if="b[0] === 'li'" class="li" v-html="'— ' + rich(String(b[1]))" />
        <div v-else-if="b[0] === 'table'" class="tbl">
          <div v-for="(row, r) in (b[1] as string[][])" :key="r" class="tr" :class="{ head: r === 0 }">
            <span v-for="(c, ci) in row" :key="ci" v-html="rich(String(c))" />
          </div>
        </div>
        <p v-else-if="b[0] !== 'title'" class="p" v-html="rich(String(b[1]))" />
      </template>
    </article>
  </main>
</template>

<style scoped>
.lg {
  padding-bottom: 32px;
}
.docs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin: 4px -16px 12px;
  padding: 0 16px 4px;
  scrollbar-width: none;
}
.chip {
  flex: none;
  padding: 7px 12px;
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink-2);
  font-size: var(--fs-13);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.chip.on {
  background: var(--primary);
  color: #fff;
}
.doc {
  display: grid;
  gap: 8px;
  font-size: var(--fs-15);
  line-height: 1.5;
}
.sub {
  color: var(--ink-2);
}
.date {
  font-size: var(--fs-13);
  color: var(--ink-3);
}
.h {
  margin-top: 12px;
  font-size: var(--fs-17, 17px);
}
.li {
  padding-left: 14px;
  text-indent: -14px;
}
.p,
.li {
  overflow-wrap: anywhere;
}
.tbl {
  display: grid;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  font-size: var(--fs-13);
}
.tr {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--line);
}
.tr:first-child {
  border-top: 0;
}
.tr span {
  padding: 8px;
  overflow-wrap: anywhere;
}
.tr.head {
  background: var(--surface);
  font-weight: 700;
}
</style>
