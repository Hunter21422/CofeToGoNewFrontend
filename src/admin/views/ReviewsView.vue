<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { ReviewAdminRead } from '@/shared/api/types'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { when } from '@/shared/utils/format'

const items = ref<ReviewAdminRead[]>([])
const total = ref(0)
const filter = ref<'all' | 'bad' | 'noreply'>('all')
const replying = ref<number | null>(null)
const text = ref('')
const TAG: Record<string, string> = { fast: 'быстро', tasty: 'вкусно', friendly: 'приветливо', slow: 'долго', cold: 'остыло', wrong_order: 'перепутали' }

async function load() {
  const p = await adminApi.reviews({
    limit: 50,
    rating: filter.value === 'bad' ? [1, 2, 3] : undefined,
    has_reply: filter.value === 'noreply' ? false : undefined,
  })
  items.value = p.items
  total.value = p.total
}
watch(filter, load)
onMounted(load)

async function send(r: ReviewAdminRead) {
  if (!text.value.trim()) return
  try {
    Object.assign(r, await adminApi.replyReview(r.id, text.value.trim()))
    replying.value = null
    text.value = ''
    toast('Ответ отправлен гостю в Telegram', 'ok')
  } catch (e) {
    toastError(e)
  }
}
</script>

<template>
  <main class="page">
    <header class="page-head"><h1>Отзывы</h1><span class="faint">{{ total }}</span></header>
    <div class="toolbar">
      <button class="chip-filter" :class="{ on: filter === 'all' }" @click="filter = 'all'">Все</button>
      <button class="chip-filter" :class="{ on: filter === 'bad' }" @click="filter = 'bad'">3 и ниже</button>
      <button class="chip-filter" :class="{ on: filter === 'noreply' }" @click="filter = 'noreply'">Без ответа</button>
    </div>

    <div class="list">
      <article v-for="r in items" :key="r.id" class="card rv" :class="{ low: r.rating <= 3 }">
        <header class="rh">
          <span class="stars" :aria-label="`${r.rating} из 5`">
            <Star v-for="n in 5" :key="n" :size="16" :fill="n <= r.rating ? 'currentColor' : 'none'" :class="{ on: n <= r.rating }" />
          </span>
          <span class="strong">{{ r.user.first_name }} {{ r.user.last_name }}</span>
          <span class="faint">{{ r.location?.name }}, заказ {{ r.order_number }}, {{ when(r.created_at) }}</span>
        </header>
        <p v-if="r.comment" class="cm">{{ r.comment }}</p>
        <p v-if="r.tags.length" class="tags"><span v-for="t in r.tags" :key="t" class="tag">{{ TAG[t] ?? t }}</span></p>
        <p v-if="r.reply" class="reply"><b>Ответ кофейни:</b> {{ r.reply }}</p>
        <div v-else-if="replying === r.id" class="rf">
          <UiField v-model="text" multiline :rows="2" placeholder="Спасибо, что написали…" />
          <div class="ra">
            <UiButton size="sm" variant="ghost" @click="replying = null">Отмена</UiButton>
            <UiButton size="sm" :disabled="!text.trim()" @click="send(r)">Ответить</UiButton>
          </div>
        </div>
        <UiButton v-else size="sm" variant="secondary" class="rb" @click="(replying = r.id), (text = '')">Ответить</UiButton>
      </article>
      <p v-if="!items.length" class="empty-line">Отзывов с таким фильтром нет</p>
    </div>
  </main>
</template>

<style scoped>
.list {
  display: grid;
  gap: 10px;
  max-width: 820px;
}
.rv {
  display: grid;
  gap: 8px;
  justify-items: start;
}
.rv.low {
  box-shadow: inset 4px 0 0 var(--danger);
}
.rh {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  font-size: var(--fs-13);
}
.stars {
  display: inline-flex;
  color: var(--surface-3);
}
.stars .on {
  color: var(--crema);
}
.cm {
  max-width: 70ch;
}
.tags {
  display: flex;
  gap: 6px;
}
.tag {
  padding: 2px 10px;
  border-radius: var(--r-pill);
  background: var(--surface-2);
  font-size: var(--fs-11);
  font-weight: 600;
  color: var(--ink-2);
}
.reply {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--primary-soft);
  font-size: var(--fs-13);
}
.rf {
  width: 100%;
  display: grid;
  gap: 8px;
}
.ra {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}
</style>
