<script setup lang="ts">
import { Gift, Phone, Stamp, X } from 'lucide-vue-next'
import { ref } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { LoyaltyRead, OrderShort, UserShort } from '@/shared/api/types'
import StampCard from '@/shared/components/StampCard.vue'
import UiBadge from '@/shared/components/UiBadge.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiStepper from '@/shared/components/UiStepper.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { tg } from '@/shared/telegram'
import { initials, money, phone as fmtPhone, plural, STATUS_LABEL, when } from '@/shared/utils/format'
import { useAdmin } from '../stores/admin'

const props = defineProps<{ user: UserShort; phone: string | null; loyalty: LoyaltyRead; lastOrders?: OrderShort[]; via?: string }>()
const emit = defineEmits<{ close: []; updated: [LoyaltyRead] }>()
const admin = useAdmin()

const loyalty = ref<LoyaltyRead>({ ...props.loyalty })
const count = ref(1)
const busy = ref<'stamp' | 'gift' | null>(null)
const done = ref<string | null>(null)

async function stamp() {
  if (!admin.locationId) return
  busy.value = 'stamp'
  try {
    const r = await adminApi.addStamps(props.user.id, admin.locationId, count.value)
    loyalty.value = r.loyalty
    emit('updated', r.loyalty)
    tg.haptic.success()
    const n = count.value
    done.value = r.gift_unlocked
      ? `Поставили ${n} ${plural(n, 'штамп', 'штампа', 'штампов')} — гостю открыт подарок. Скажите ему об этом!`
      : `Поставили ${n} ${plural(n, 'штамп', 'штампа', 'штампов')}. До подарка ${r.loyalty.stamps_left}.`
    toast(r.gift_unlocked ? 'Подарок открыт!' : 'Штамп поставлен', 'ok')
    count.value = 1
  } catch (e) {
    toastError(e)
  } finally {
    busy.value = null
  }
}
async function redeem() {
  if (!admin.locationId) return
  if (!(await tg.confirm(`Выдать ${props.user.first_name} напиток в подарок? Подарок спишется с карты.`))) return
  busy.value = 'gift'
  try {
    const r = await adminApi.redeemGift(props.user.id, admin.locationId)
    loyalty.value = r.loyalty
    emit('updated', r.loyalty)
    tg.haptic.success()
    done.value = 'Подарок списан. Приготовьте гостю любой напиток за счёт заведения.'
  } catch (e) {
    toastError(e)
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <section class="guest" aria-live="polite">
    <header class="gh">
      <span class="ava">{{ initials(user.first_name, user.last_name) }}</span>
      <div class="gw">
        <h2 class="gname">{{ user.first_name }} {{ user.last_name }}</h2>
        <p class="gmeta">
          <span v-if="user.username">@{{ user.username }}</span>
          <span v-if="phone"><Phone :size="13" />{{ fmtPhone(phone) }}</span>
        </p>
      </div>
      <UiBadge v-if="via" tone="ok" dot>{{ via }}</UiBadge>
      <button class="x" aria-label="Закрыть карточку гостя" @click="emit('close')"><X :size="20" /></button>
    </header>

    <StampCard :stamps="loyalty.stamps" :per-gift="loyalty.stamps_per_gift" :gifts="loyalty.gifts_available" compact />

    <p v-if="done" class="done">{{ done }}</p>

    <div class="act">
      <div class="cnt">
        <span class="label">Напитков в покупке</span>
        <UiStepper v-model="count" :min="1" :max="10" />
      </div>
      <UiButton size="lg" block :loading="busy === 'stamp'" :disabled="!!busy" @click="stamp">
        <Stamp :size="20" />
        Поставить {{ count }} {{ plural(count, 'штамп', 'штампа', 'штампов') }}
      </UiButton>
      <UiButton v-if="loyalty.gifts_available" variant="crema" size="lg" block :loading="busy === 'gift'" :disabled="!!busy" @click="redeem">
        <Gift :size="20" />
        Выдать подарок <span class="num">({{ loyalty.gifts_available }})</span>
      </UiButton>
    </div>

    <div v-if="lastOrders?.length" class="last">
      <h3 class="card-title">Последние заказы</h3>
      <div v-for="o in lastOrders" :key="o.id" class="lo">
        <span class="num lnum">{{ o.display_number }}</span>
        <span class="lw">{{ when(o.created_at) }}, {{ o.location.name }}</span>
        <span class="faint">{{ STATUS_LABEL[o.status] }}</span>
        <span class="num">{{ money(o.total) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.guest {
  display: grid;
  gap: 14px;
}
.gh {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ava {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary);
  color: var(--on-primary);
  font-family: var(--font-display);
  font-weight: 600;
}
.gw {
  flex: 1;
  min-width: 0;
}
.gname {
  font-size: var(--fs-20);
}
.gmeta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: var(--fs-13);
  color: var(--ink-2);
}
.gmeta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.x {
  color: var(--ink-3);
  padding: 6px;
}
.done {
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--ok-soft);
  color: var(--ok);
  font-weight: 600;
}
.act {
  display: grid;
  gap: 10px;
}
.cnt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.last {
  padding-top: 6px;
}
.lo {
  display: grid;
  grid-template-columns: 52px 1fr auto auto;
  gap: 10px;
  padding: 8px 0;
  font-size: var(--fs-13);
  border-top: 1px solid var(--line);
  align-items: center;
}
.lnum {
  font-weight: 600;
}
.lw {
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
