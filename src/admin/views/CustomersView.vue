<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { onMounted, reactive, ref, watch } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { CustomerDetail, CustomerListItem } from '@/shared/api/types'
import StampCard from '@/shared/components/StampCard.vue'
import UiBadge from '@/shared/components/UiBadge.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import UiSkeleton from '@/shared/components/UiSkeleton.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { date, money, phone as fmtPhone, STATUS_LABEL, when } from '@/shared/utils/format'

const f = reactive({ q: '', inactive_days: undefined as number | undefined })
const items = ref<CustomerListItem[]>([])
const total = ref(0)
const loading = ref(true)
const detail = ref<CustomerDetail | null>(null)
const adj = reactive({ stamps: 0, gifts: 0, reason: '' })
const saving = ref(false)

async function load(offset = 0) {
  const p = await adminApi.customers({ ...f, limit: 30, offset })
  items.value = offset ? [...items.value, ...p.items] : p.items
  total.value = p.total
  loading.value = false
}
let t: ReturnType<typeof setTimeout>
watch(f, () => {
  clearTimeout(t)
  t = setTimeout(() => load(), 250)
})
onMounted(() => load())

async function open(id: number) {
  detail.value = await adminApi.customer(id)
  Object.assign(adj, { stamps: 0, gifts: 0, reason: '' })
}
async function adjust() {
  if (!detail.value) return
  if (!adj.stamps && !adj.gifts) return toast('Измените штампы или подарки', 'error')
  if (adj.reason.trim().length < 5) return toast('Напишите причину — она попадёт в историю', 'error')
  saving.value = true
  try {
    const r = await adminApi.adjustLoyalty(detail.value.user.id, Number(adj.stamps), Number(adj.gifts), adj.reason.trim())
    detail.value.loyalty = r.loyalty
    Object.assign(adj, { stamps: 0, gifts: 0, reason: '' })
    toast('Баланс карты изменён', 'ok')
    load()
  } catch (e) {
    toastError(e)
  } finally {
    saving.value = false
  }
}
async function toggleBlock() {
  if (!detail.value) return
  const v = !detail.value.is_blocked
  if (v && !confirm('Заблокировать гостя? Он не сможет делать заказы и копить штампы.')) return
  detail.value = await adminApi.blockCustomer(detail.value.user.id, v)
  toast(v ? 'Гость заблокирован' : 'Блокировка снята', 'ok')
}
</script>

<template>
  <main class="page">
    <header class="page-head">
      <h1>Гости</h1>
      <span class="faint">{{ total }}</span>
    </header>

    <div class="toolbar">
      <div class="q">
        <UiField v-model="f.q" placeholder="Имя, @ник или телефон">
          <template #prefix><Search :size="16" class="faint" /></template>
        </UiField>
      </div>
      <button class="chip-filter" :class="{ on: !f.inactive_days }" @click="f.inactive_days = undefined">Все</button>
      <button class="chip-filter" :class="{ on: f.inactive_days === 30 }" @click="f.inactive_days = 30">Не заходили 30 дней</button>
    </div>

    <div class="table-wrap">
      <table class="t">
        <thead>
          <tr><th>Гость</th><th>Телефон</th><th class="r">Заказов</th><th class="r">Потратил</th><th>Карта</th><th>Последний заказ</th></tr>
        </thead>
        <tbody>
          <template v-if="loading"><tr v-for="i in 8" :key="i"><td colspan="6"><UiSkeleton h="18px" /></td></tr></template>
          <tr v-for="c in items" v-else :key="c.id" class="click" tabindex="0" @click="open(c.id)" @keyup.enter="open(c.id)">
            <td><span class="strong">{{ c.first_name }}</span><span v-if="c.username" class="faint"> @{{ c.username }}</span></td>
            <td class="faint nowrap">{{ fmtPhone(c.phone) || '—' }}</td>
            <td class="r num">{{ c.orders_count }}</td>
            <td class="r num strong">{{ money(c.total_spent) }}</td>
            <td><span class="stamps num">{{ c.stamps }}/5</span></td>
            <td class="faint nowrap">{{ c.last_order_at ? when(c.last_order_at) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <UiButton v-if="items.length < total" variant="ghost" block class="more" @click="load(items.length)">Показать ещё</UiButton>

    <UiSheet :open="!!detail" :title="detail ? `${detail.user.first_name} ${detail.user.last_name ?? ''}` : ''" @close="detail = null">
      <div v-if="detail" class="form">
        <div class="facts">
          <span v-if="detail.user.username">@{{ detail.user.username }}</span>
          <span v-if="detail.user.phone">{{ fmtPhone(detail.user.phone) }}</span>
          <span v-if="detail.user.birth_date">ДР {{ date(detail.user.birth_date) }}</span>
          <span>с нами с {{ date(detail.user.created_at, true) }}</span>
          <UiBadge v-if="detail.is_blocked" tone="danger">заблокирован</UiBadge>
        </div>
        <div class="kpis">
          <div><span class="kv num">{{ detail.orders_count }}</span><span class="kl">заказов</span></div>
          <div><span class="kv num">{{ money(detail.total_spent) }}</span><span class="kl">потратил</span></div>
          <div><span class="kv num">{{ detail.loyalty.lifetime_gifts }}</span><span class="kl">подарков</span></div>
        </div>

        <StampCard :stamps="detail.loyalty.stamps" :per-gift="detail.loyalty.stamps_per_gift" :gifts="detail.loyalty.gifts_available" compact />

        <section class="card adj">
          <h3 class="card-title">Поправить карту вручную</h3>
          <div class="form-row">
            <UiField v-model="adj.stamps" type="number" label="Штампы ±" />
            <UiField v-model="adj.gifts" type="number" label="Подарки ±" />
          </div>
          <UiField v-model="adj.reason" label="Причина" placeholder="Например: не начислили штамп 3 октября" />
          <UiButton :loading="saving" @click="adjust">Применить</UiButton>
        </section>

        <section v-if="detail.last_orders.length">
          <h3 class="card-title">Последние заказы</h3>
          <div v-for="o in detail.last_orders" :key="o.id" class="lo">
            <span class="num strong">{{ o.display_number }}</span>
            <span class="faint">{{ when(o.created_at) }}</span>
            <span>{{ STATUS_LABEL[o.status] }}</span>
            <span class="num">{{ money(o.total) }}</span>
          </div>
        </section>

        <UiButton :variant="detail.is_blocked ? 'secondary' : 'danger'" @click="toggleBlock">
          {{ detail.is_blocked ? 'Снять блокировку' : 'Заблокировать гостя' }}
        </UiButton>
      </div>
    </UiSheet>
  </main>
</template>

<style scoped>
.q {
  flex: 1 1 260px;
  max-width: 400px;
}
.q :deep(.ctl) {
  background: var(--surface);
  min-height: 40px;
}
.nowrap {
  white-space: nowrap;
}
.stamps {
  color: var(--stamp);
  font-size: var(--fs-13);
}
.more {
  margin-top: 10px;
}
.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  color: var(--ink-2);
  font-size: var(--fs-13);
  align-items: center;
}
.kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.kpis div {
  display: grid;
  padding: 12px;
  border-radius: 14px;
  background: var(--surface-2);
}
.kv {
  font-size: var(--fs-17);
  font-weight: 700;
}
.kl {
  font-size: var(--fs-11);
  color: var(--ink-3);
}
.adj {
  background: var(--surface-2);
  display: grid;
  gap: 10px;
}
.adj :deep(.ctl) {
  background: var(--surface);
}
.adj .card-title {
  margin: 0;
}
.lo {
  display: grid;
  grid-template-columns: 52px 1fr auto auto;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--line);
  font-size: var(--fs-13);
}
</style>
