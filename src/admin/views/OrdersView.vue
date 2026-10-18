<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { onMounted, reactive, ref, watch } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { AdminOrderRead, OrderStatus } from '@/shared/api/types'
import UiBadge from '@/shared/components/UiBadge.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import UiSkeleton from '@/shared/components/UiSkeleton.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { money, PAYMENT_LABEL, STATUS_LABEL, STATUS_TONE, todayIso, when } from '@/shared/utils/format'
import OrderDetail from '../components/OrderDetail.vue'
import { useAdmin } from '../stores/admin'

const admin = useAdmin()
const f = reactive({ q: '', status: [] as OrderStatus[], date_from: todayIso(-6), date_to: todayIso() })
const items = ref<AdminOrderRead[]>([])
const total = ref(0)
const loading = ref(true)
const opened = ref<AdminOrderRead | null>(null)
const busy = ref(false)
const PAGE = 30

const STATUS_FILTERS: { label: string; value: OrderStatus[] }[] = [
  { label: 'Все', value: [] },
  { label: 'В работе', value: ['new', 'accepted', 'preparing', 'ready'] },
  { label: 'Выданы', value: ['completed'] },
  { label: 'Отменены', value: ['cancelled', 'rejected', 'expired'] },
]

async function load(offset = 0) {
  if (offset === 0) loading.value = true
  try {
    const p = await adminApi.orders({ location_id: admin.locationId ?? undefined, ...f, limit: PAGE, offset })
    items.value = offset ? [...items.value, ...p.items] : p.items
    total.value = p.total
  } catch (e) {
    toastError(e)
  } finally {
    loading.value = false
  }
}
let t: ReturnType<typeof setTimeout>
watch(f, () => {
  clearTimeout(t)
  t = setTimeout(() => load(), 250)
})
onMounted(() => load())

async function move(to: OrderStatus) {
  if (!opened.value) return
  busy.value = true
  try {
    opened.value = await adminApi.setStatus(opened.value.id, { status: to })
    toast(`${opened.value.display_number}: ${STATUS_LABEL[to].toLowerCase()}`, 'ok')
    load()
  } catch (e) {
    toastError(e)
  } finally {
    busy.value = false
  }
}
async function reject() {
  if (!opened.value) return
  const reason = prompt('Причина отказа — гость её увидит')
  if (!reason || reason.trim().length < 3) return
  opened.value = await adminApi.reject(opened.value.id, reason.trim())
  load()
}
const sameStatus = (a: OrderStatus[], b: OrderStatus[]) => a.length === b.length && a.every((x) => b.includes(x))
</script>

<template>
  <main class="page">
    <header class="page-head">
      <h1>Заказы</h1>
      <span class="faint">{{ total }} за период</span>
    </header>

    <div class="toolbar">
      <div class="q">
        <UiField v-model="f.q" placeholder="Номер, имя, телефон" inputmode="search">
          <template #prefix><Search :size="17" class="faint" /></template>
        </UiField>
      </div>
      <button v-for="s in STATUS_FILTERS" :key="s.label" class="chip-filter" :class="{ on: sameStatus(f.status, s.value) }" @click="f.status = s.value">
        {{ s.label }}
      </button>
      <label class="date"><span class="visually-hidden">С</span><input v-model="f.date_from" type="date" class="select" /></label>
      <label class="date"><span class="visually-hidden">По</span><input v-model="f.date_to" type="date" class="select" /></label>
    </div>

    <div class="table-wrap">
      <table class="t">
        <thead>
          <tr>
            <th>Номер</th>
            <th>Когда</th>
            <th>Гость</th>
            <th>Состав</th>
            <th>Оплата</th>
            <th>Статус</th>
            <th class="r">Сумма</th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr v-for="i in 8" :key="i"><td colspan="7"><UiSkeleton h="18px" /></td></tr>
        </tbody>
        <tbody v-else>
          <tr v-for="o in items" :key="o.id" class="click" tabindex="0" @click="opened = o" @keyup.enter="opened = o">
            <td class="strong num">{{ o.display_number }}</td>
            <td class="nowrap">{{ when(o.created_at) }}</td>
            <td>{{ o.user.first_name }} {{ o.user.last_name }}</td>
            <td class="comp">{{ o.items.map((i) => `${i.quantity > 1 ? i.quantity + '× ' : ''}${i.product_name}`).join(', ') }}</td>
            <td class="nowrap faint">{{ PAYMENT_LABEL[o.payment_method] }}</td>
            <td><UiBadge :tone="STATUS_TONE[o.status]">{{ STATUS_LABEL[o.status] }}</UiBadge></td>
            <td class="r strong num">{{ money(o.total) }}</td>
          </tr>
          <tr v-if="!items.length"><td colspan="7" class="empty-line">За выбранный период заказов с такими условиями нет</td></tr>
        </tbody>
      </table>
    </div>
    <UiButton v-if="items.length < total" variant="ghost" block class="more" @click="load(items.length)">Показать ещё</UiButton>

    <UiSheet :open="!!opened" :title="opened ? `Заказ ${opened.display_number}` : ''" @close="opened = null">
      <OrderDetail v-if="opened" :order="opened" :busy="busy" @move="move" @reject="reject" @updated="(o) => (opened = o)" />
    </UiSheet>
  </main>
</template>

<style scoped>
.q {
  flex: 1 1 260px;
}
.q :deep(.ctl) {
  background: var(--surface);
  min-height: 40px;
}
.date .select {
  height: 40px;
  background: var(--surface);
}
.nowrap {
  white-space: nowrap;
}
.comp {
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-2);
}
.more {
  margin-top: 10px;
}
</style>
