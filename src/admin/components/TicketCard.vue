<script setup lang="ts">
import { Clock, MessageSquare } from 'lucide-vue-next'
import { computed } from 'vue'
import type { AdminOrderRead, OrderStatus } from '@/shared/api/types'
import UiButton from '@/shared/components/UiButton.vue'
import { elapsed, money, time } from '@/shared/utils/format'

const props = defineProps<{ order: AdminOrderRead; now: number; busy?: boolean; lateAfterMin?: number }>()
const emit = defineEmits<{ next: [OrderStatus]; reject: []; open: [] }>()

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: 'accepted', label: 'Принять' },
  accepted: { to: 'preparing', label: 'Готовить' },
  preparing: { to: 'ready', label: 'Готов' },
  ready: { to: 'completed', label: 'Выдан' },
}
const next = computed(() => NEXT[props.order.status])
// ждёт с момента входа в текущий статус
const since = computed(() => props.order.status_history.at(-1)?.created_at ?? props.order.created_at)
const waitMin = computed(() => (props.now - new Date(since.value).getTime()) / 60000)
const late = computed(() => {
  const lim = props.order.status === 'new' ? (props.lateAfterMin ?? 3) : props.order.status === 'ready' ? 15 : 10
  return waitMin.value > lim
})
const paidOnline = computed(() => props.order.payment_status === 'paid')
</script>

<template>
  <article class="ticket" :class="[order.status, { late }]">
    <button class="head" :aria-label="`Открыть заказ ${order.display_number}`" @click="emit('open')">
      <span class="num">{{ order.display_number }}</span>
      <span class="who">
        <span class="name">{{ order.user.first_name }} {{ order.user.last_name?.[0] ? order.user.last_name[0] + '.' : '' }}</span>
        <span class="meta">
          {{ order.type === 'dine_in' ? 'в зале' : 'с собой' }}<template v-if="order.pickup_at">, к {{ time(order.pickup_at) }}</template>
        </span>
      </span>
      <span class="wait" :title="`В этом статусе ${elapsed(since, now)}`"><Clock :size="13" />{{ elapsed(since, now) }}</span>
    </button>

    <ul class="items">
      <li v-for="i in order.items" :key="i.id" :class="{ gift: i.is_gift }">
        <span class="q">{{ i.quantity }}</span>
        <span class="it">
          <span class="iname">{{ i.product_name }} <b v-if="i.variant_name" class="v">{{ i.variant_name }}</b></span>
          <ul v-if="i.modifiers.length" class="mods"><li v-for="m in i.modifiers" :key="m.id">+ {{ m.name }}</li></ul>
          <span v-if="i.is_gift" class="giftmark">подарок по карте</span>
        </span>
      </li>
    </ul>

    <p v-if="order.comment" class="comment"><MessageSquare :size="14" />{{ order.comment }}</p>

    <div class="perf" aria-hidden="true" />

    <footer class="foot">
      <span class="pay" :class="{ due: !paidOnline }">{{ paidOnline ? 'Оплачен' : `К оплате ${money(order.total)}` }}</span>
      <div class="acts">
        <UiButton v-if="order.status === 'new'" variant="ghost" size="sm" :disabled="busy" @click="emit('reject')">Отклонить</UiButton>
        <UiButton v-if="order.status === 'accepted'" variant="ghost" size="sm" :disabled="busy" @click="emit('next', 'ready')">Сразу готов</UiButton>
        <UiButton v-if="next" :variant="order.status === 'ready' ? 'secondary' : 'primary'" size="sm" :loading="busy" @click="emit('next', next.to)">
          {{ next.label }}
        </UiButton>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.ticket {
  position: relative;
  background: var(--surface);
  border-radius: 14px;
  box-shadow: var(--shadow-lift);
  border-top: 4px solid var(--info);
  overflow: hidden;
}
.ticket.accepted {
  border-top-color: var(--primary);
}
.ticket.preparing {
  border-top-color: var(--warn);
}
.ticket.ready {
  border-top-color: var(--ok);
}
.ticket.late .wait {
  background: var(--danger-soft);
  color: var(--danger);
}
.ticket.new {
  animation: arrive 0.5s var(--ease);
}
@keyframes arrive {
  from {
    transform: translateY(-8px);
    opacity: 0;
  }
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px 10px;
  text-align: left;
}
.head .num {
  font-size: var(--fs-24);
  font-weight: 700;
}
.who {
  flex: 1;
  min-width: 0;
  display: grid;
}
.name {
  font-weight: 600;
  font-size: var(--fs-13);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta {
  font-size: var(--fs-11);
  color: var(--ink-3);
}
.wait {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border-radius: var(--r-pill);
  background: var(--surface-2);
  font-size: var(--fs-11);
  font-weight: 700;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}
.items {
  list-style: none;
  margin: 0;
  padding: 0 14px;
  display: grid;
  gap: 8px;
}
.items li {
  display: flex;
  gap: 10px;
}
.q {
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-display);
  font-size: var(--fs-13);
  font-weight: 600;
}
.it {
  display: grid;
  gap: 1px;
}
.iname {
  font-weight: 600;
}
.v {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--fs-11);
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--surface-2);
  vertical-align: 1px;
}
.mods {
  font-size: var(--fs-13);
  color: var(--ink-2);
  display: grid;
  gap: 1px;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
}

.gift .q {
  background: var(--crema);
  color: #3b2a0c;
}
.giftmark {
  font-size: var(--fs-11);
  font-weight: 700;
  color: var(--crema-ink);
}
.comment {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  margin: 10px 14px 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--warn-soft);
  color: var(--warn);
  font-weight: 600;
  font-size: var(--fs-13);
}
.comment svg {
  flex: none;
  margin-top: 2px;
}
.perf {
  margin: 12px 0 0;
  height: 0;
  border-top: 2px dashed var(--line);
  position: relative;
}
.perf::before,
.perf::after {
  content: '';
  position: absolute;
  top: -8px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--paper);
}
.perf::before {
  left: -7px;
}
.perf::after {
  right: -7px;
}
.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  padding: 10px 10px 10px 14px;
}
.pay {
  flex: 1 0 auto;
  font-size: var(--fs-11);
  font-weight: 700;
  color: var(--ok);
}
.pay.due {
  color: var(--warn);
}
.acts {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
  margin-left: auto;
}
</style>
