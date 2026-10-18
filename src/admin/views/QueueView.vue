<script setup lang="ts">
import { Pause, Play } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { AdminOrderRead, LocationRead, OrderStatus, QueueOut } from '@/shared/api/types'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSegmented from '@/shared/components/UiSegmented.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import { useNow, usePolling } from '@/shared/composables/usePolling'
import { toast, toastError } from '@/shared/composables/useToast'
import { tg } from '@/shared/telegram'
import OrderDetail from '../components/OrderDetail.vue'
import TicketCard from '../components/TicketCard.vue'
import { chime } from '../composables/chime'
import { useAdmin } from '../stores/admin'

const admin = useAdmin()
const queue = ref<QueueOut | null>(null)
const loc = ref<LocationRead | null>(null)
const busy = ref<number | null>(null)
const now = useNow(1000)
const tab = ref<'new' | 'accepted' | 'preparing' | 'ready'>('new')
const opened = ref<AdminOrderRead | null>(null)
const rejecting = ref<AdminOrderRead | null>(null)
const rejectReason = ref('')
let knownNew = new Set<number>()
let first = true

const COLS = [
  { key: 'new', title: 'Новые', short: 'Новые' },
  { key: 'accepted', title: 'Приняты', short: 'Приняты' },
  { key: 'preparing', title: 'Готовятся', short: 'Готовим' },
  { key: 'ready', title: 'Ждут выдачи', short: 'Выдача' },
] as const

async function load() {
  if (!admin.locationId) return
  const q = await adminApi.queue(admin.locationId)
  const fresh = q.new.filter((o) => !knownNew.has(o.id))
  if (!first && fresh.length) {
    if (admin.sound) chime()
    tg.haptic.warning()
    toast(`Новый заказ ${fresh.map((o) => o.display_number).join(', ')}`, 'info')
  }
  knownNew = new Set(q.new.map((o) => o.id))
  first = false
  queue.value = q
}
usePolling(load, 4000)
usePolling(async () => {
  loc.value = (await adminApi.locations()).find((l) => l.id === admin.locationId) ?? null
}, 30000)

const counts = computed(() => Object.fromEntries(COLS.map((c) => [c.key, queue.value?.[c.key].length ?? 0])))
const total = computed(() => COLS.reduce((a, c) => a + counts.value[c.key], 0))

async function move(o: AdminOrderRead, to: OrderStatus) {
  busy.value = o.id
  tg.haptic.tap()
  try {
    await adminApi.setStatus(o.id, { status: to })
    if (to === 'ready') toast(`${o.display_number} готов — гостю ушло уведомление`, 'ok')
    if (to === 'completed') toast(`${o.display_number} выдан, штампы начислены`, 'ok')
    await load()
    if (opened.value?.id === o.id) opened.value = await adminApi.order(o.id)
  } catch (e) {
    toastError(e)
  } finally {
    busy.value = null
  }
}
async function reject() {
  const o = rejecting.value
  if (!o || rejectReason.value.trim().length < 3) return
  busy.value = o.id
  try {
    await adminApi.reject(o.id, rejectReason.value.trim())
    toast(`${o.display_number} отклонён, гость получит сообщение`, 'ok')
    rejecting.value = null
    rejectReason.value = ''
    opened.value = null
    await load()
  } catch (e) {
    toastError(e)
  } finally {
    busy.value = null
  }
}
async function toggleAccepting() {
  if (!loc.value) return
  try {
    loc.value = await adminApi.updateLocation(loc.value.id, { accepts_orders: !loc.value.accepts_orders })
    toast(loc.value.accepts_orders ? 'Онлайн-заказы снова принимаются' : 'Онлайн-заказы на паузе', 'ok')
  } catch (e) {
    toastError(e)
  }
}
const REASONS = ['Закончилось молоко', 'Сломалась кофемашина', 'Слишком много заказов', 'Закрываемся']
</script>

<template>
  <main class="page queue-page">
    <header class="page-head">
      <h1>Очередь <span v-if="total" class="total num">{{ total }}</span></h1>
      <UiButton v-if="loc" :variant="loc.accepts_orders ? 'secondary' : 'crema'" size="sm" @click="toggleAccepting">
        <component :is="loc.accepts_orders ? Pause : Play" :size="16" />
        {{ loc.accepts_orders ? 'Поставить онлайн-заказы на паузу' : 'Онлайн-заказы на паузе — включить' }}
      </UiButton>
    </header>

    <div class="tabs-m">
      <UiSegmented
        v-model="tab"
        size="sm"
        :options="COLS.map((c) => ({ value: c.key, label: c.short, hint: String(counts[c.key]) }))"
      />
    </div>

    <div class="board">
      <section v-for="c in COLS" :key="c.key" class="col" :class="[c.key, { show: tab === c.key }]">
        <h2 class="col-title">{{ c.title }} <span class="cnt num">{{ counts[c.key] }}</span></h2>
        <div class="stack">
          <TicketCard
            v-for="o in queue?.[c.key] ?? []"
            :key="o.id"
            :order="o"
            :now="now"
            :busy="busy === o.id"
            @next="(to) => move(o, to)"
            @reject="rejecting = o"
            @open="opened = o"
          />
          <p v-if="queue && !queue[c.key].length" class="empty-col">
            {{ c.key === 'new' ? 'Новых заказов нет. Как только гость оплатит — заказ появится здесь со звуком.' : 'Пусто' }}
          </p>
        </div>
      </section>
    </div>

    <UiSheet :open="!!opened" :title="opened ? `Заказ ${opened.display_number}` : ''" @close="opened = null">
      <OrderDetail v-if="opened" :order="opened" :busy="busy === opened.id" @move="(to) => move(opened!, to)" @reject="rejecting = opened" />
    </UiSheet>

    <UiSheet :open="!!rejecting" :title="rejecting ? `Отклонить ${rejecting.display_number}` : ''" @close="rejecting = null">
      <div class="form">
        <p class="muted">Гость увидит причину, а деньги за онлайн-оплату вернутся автоматически.</p>
        <div class="reasons">
          <button v-for="r in REASONS" :key="r" class="chip-filter" :class="{ on: rejectReason === r }" @click="rejectReason = r">{{ r }}</button>
        </div>
        <UiField v-model="rejectReason" label="Причина" placeholder="Своими словами" />
      </div>
      <template #footer>
        <UiButton variant="danger" block size="lg" :disabled="rejectReason.trim().length < 3" :loading="!!rejecting && busy === rejecting.id" @click="reject">
          Отклонить заказ
        </UiButton>
      </template>
    </UiSheet>
  </main>
</template>

<style scoped>
.queue-page {
  max-width: none;
}
.total {
  font-size: var(--fs-17);
  color: var(--ink-3);
  margin-left: 6px;
}
.board {
  display: grid;
  grid-template-columns: repeat(4, minmax(240px, 1fr));
  gap: 14px;
  align-items: start;
}
.col {
  min-width: 0;
  border-radius: 18px;
  background: var(--surface-2);
  padding: 12px;
  min-height: 60vh;
}
.col-title {
  font-family: var(--font-body);
  font-size: var(--fs-15);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 2px 4px 12px;
}
.cnt {
  font-size: var(--fs-13);
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: var(--r-pill);
  background: var(--surface);
  display: grid;
  place-items: center;
}
.new .cnt {
  background: var(--info);
  color: #fff;
}
.stack {
  display: grid;
  gap: 10px;
}
.empty-col {
  padding: 20px 10px;
  text-align: center;
  color: var(--ink-3);
  font-size: var(--fs-13);
}
.tabs-m {
  display: none;
}
.reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.reasons .chip-filter {
  background: var(--surface-2);
}
@media (max-width: 1100px) {
  .board {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 899px) {
  .tabs-m {
    display: block;
    margin-bottom: 12px;
  }
  .board {
    display: block;
  }
  .col {
    display: none;
    background: none;
    padding: 0;
    min-height: 0;
  }
  .col.show {
    display: block;
  }
  .col-title {
    display: none;
  }
}
</style>
