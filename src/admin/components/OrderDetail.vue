<script setup lang="ts">
import { computed, ref } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { AdminOrderRead, OrderStatus } from '@/shared/api/types'
import UiBadge from '@/shared/components/UiBadge.vue'
import UiButton from '@/shared/components/UiButton.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { money, PAYMENT_LABEL, STATUS_LABEL, STATUS_TONE, time, when } from '@/shared/utils/format'

const props = defineProps<{ order: AdminOrderRead; busy?: boolean }>()
const emit = defineEmits<{ move: [OrderStatus]; reject: []; updated: [AdminOrderRead] }>()
const refunding = ref(false)

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }[]>> = {
  new: [{ to: 'accepted', label: 'Принять' }],
  accepted: [{ to: 'preparing', label: 'Начать готовить' }, { to: 'ready', label: 'Сразу готов' }],
  preparing: [{ to: 'ready', label: 'Готов' }],
  ready: [{ to: 'completed', label: 'Выдан гостю' }],
}
const actions = computed(() => NEXT[props.order.status] ?? [])
const canRefund = computed(() => props.order.payment_status === 'paid' && ['cancelled', 'rejected', 'completed'].includes(props.order.status))

async function refund() {
  if (!confirm(`Вернуть ${money(props.order.total)} гостю?`)) return
  refunding.value = true
  try {
    const o = await adminApi.refund(props.order.id, { reason: 'Возврат из панели' })
    emit('updated', o)
    toast('Возврат оформлен', 'ok')
  } catch (e) {
    toastError(e)
  } finally {
    refunding.value = false
  }
}
</script>

<template>
  <div class="od">
    <div class="top">
      <UiBadge :tone="STATUS_TONE[order.status]" dot>{{ STATUS_LABEL[order.status] }}</UiBadge>
      <span class="faint">{{ when(order.created_at) }}</span>
    </div>

    <dl class="facts">
      <div><dt>Гость</dt><dd>{{ order.user.first_name }} {{ order.user.last_name }}<span v-if="order.user.username" class="faint"> @{{ order.user.username }}</span></dd></div>
      <div><dt>Где</dt><dd>{{ order.location.name }}, {{ order.type === 'dine_in' ? 'в зале' : 'с собой' }}</dd></div>
      <div><dt>Когда</dt><dd>{{ order.pickup_at ? `к ${time(order.pickup_at)}` : 'как можно скорее' }}</dd></div>
      <div><dt>Оплата</dt><dd>{{ PAYMENT_LABEL[order.payment_method] }}, {{ order.payment_status === 'paid' ? 'оплачен' : order.payment_status === 'refunded' ? 'возвращён' : 'не оплачен' }}</dd></div>
      <div v-if="order.accepted_by"><dt>Принял</dt><dd>{{ order.accepted_by.user.first_name }}</dd></div>
      <div v-if="order.cancel_reason"><dt>Причина отмены</dt><dd>{{ order.cancel_reason }}</dd></div>
    </dl>

    <p v-if="order.comment" class="comment">«{{ order.comment }}»</p>

    <div class="items">
      <div v-for="i in order.items" :key="i.id" class="item">
        <span class="q num">{{ i.quantity }}×</span>
        <span class="im">
          <span class="in">{{ i.product_name }} <span class="faint">{{ i.variant_name }}</span></span>
          <ul v-if="i.modifiers.length" class="mods"><li v-for="m in i.modifiers" :key="m.id">+ {{ m.name }}</li></ul>
          <UiBadge v-if="i.is_gift" tone="crema">подарок</UiBadge>
        </span>
        <span class="num">{{ money(i.line_total) }}</span>
      </div>
      <div v-if="order.discount_total" class="sumrow"><span>Скидка</span><span class="num">−{{ money(order.discount_total) }}</span></div>
      <div class="sumrow big"><span>Итого</span><span class="num">{{ money(order.total) }}</span></div>
    </div>

    <h3 class="card-title hist">История</h3>
    <ol class="hist-list">
      <li v-for="(h, i) in order.status_history" :key="i">
        <span class="num faint">{{ time(h.created_at) }}</span>
        <span>{{ STATUS_LABEL[h.to_status] }}<span v-if="h.comment" class="faint">, {{ h.comment }}</span></span>
      </li>
    </ol>

    <div v-if="actions.length || order.status === 'new' || canRefund" class="acts">
      <UiButton v-for="a in actions" :key="a.to" :loading="busy" @click="emit('move', a.to)">{{ a.label }}</UiButton>
      <UiButton v-if="['new', 'accepted'].includes(order.status)" variant="danger" :disabled="busy" @click="emit('reject')">Отклонить</UiButton>
      <UiButton v-if="canRefund" variant="secondary" :loading="refunding" @click="refund">Вернуть деньги</UiButton>
    </div>
  </div>
</template>

<style scoped>
.od {
  display: grid;
  gap: 14px;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--fs-13);
}
.facts {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}
.facts div {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-2);
}
.facts dt {
  font-size: var(--fs-11);
  color: var(--ink-3);
  font-weight: 600;
}
.facts dd {
  margin: 2px 0 0;
  font-weight: 500;
}
.comment {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--warn-soft);
  color: var(--warn);
  font-weight: 600;
}
.items {
  display: grid;
}
.item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
.q {
  width: 26px;
  color: var(--ink-3);
}
.im {
  flex: 1;
  display: grid;
  gap: 2px;
  justify-items: start;
}
.in {
  font-weight: 600;
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

.sumrow {
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  color: var(--ink-2);
}
.sumrow.big {
  font-weight: 700;
  color: var(--ink);
  font-size: var(--fs-17);
}
.hist {
  margin: 4px 0 0;
}
.hist-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
  font-size: var(--fs-13);
}
.hist-list li {
  display: flex;
  gap: 12px;
}
.acts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 6px;
}
</style>
