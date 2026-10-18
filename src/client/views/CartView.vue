<script setup lang="ts">
import { Banknote, CreditCard, Gift, MapPin, Smartphone, Trash2, Wallet } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { clientApi } from '@/shared/api/client'
import { newIdempotencyKey } from '@/shared/api/http'
import type { PaymentMethod } from '@/shared/api/types'
import ProductArt from '@/shared/components/ProductArt.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiEmpty from '@/shared/components/UiEmpty.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSegmented from '@/shared/components/UiSegmented.vue'
import UiStepper from '@/shared/components/UiStepper.vue'
import UiSwitch from '@/shared/components/UiSwitch.vue'
import { toastError } from '@/shared/composables/useToast'
import { tg } from '@/shared/telegram'
import { money, PAYMENT_LABEL, plural, time } from '@/shared/utils/format'
import LocationSheet from '../components/LocationSheet.vue'
import { useCart } from '../stores/cart'
import { useSession } from '../stores/session'

const cart = useCart()
const session = useSession()
const router = useRouter()

const locOpen = ref(false)
const promoInput = ref(cart.promoCode ?? '')
const when = ref<'asap' | 'later'>(cart.pickupAt ? 'later' : 'asap')
const placing = ref(false)
// один ключ на попытку оформления — повторный тап не создаст второй заказ
let idemKey = newIdempotencyKey()

const loc = computed(() => session.location)
const q = computed(() => cart.quote)

// ---------- пересчёт ----------
let t: ReturnType<typeof setTimeout>
function requote() {
  clearTimeout(t)
  t = setTimeout(() => session.locationId && cart.requote(session.locationId), 250)
}
watch(() => [cart.lines, cart.promoCode, cart.useGift, cart.pickupAt, session.locationId], requote, { deep: true })
onMounted(() => {
  requote()
  const methods = loc.value?.payment_methods ?? []
  if (!methods.includes(cart.paymentMethod) && methods[0]) cart.paymentMethod = methods[0]
})
watch(
  () => loc.value?.payment_methods,
  (m) => m && !m.includes(cart.paymentMethod) && m[0] && (cart.paymentMethod = m[0]),
)

// ---------- время ----------
const slots = computed(() => {
  const l = loc.value
  if (!l) return []
  const now = new Date()
  const wd = (now.getDay() + 6) % 7
  const h = l.hours.find((x) => x.weekday === wd)
  if (!h || h.is_closed || !h.opens_at || !h.closes_at) return []
  const [oh, om] = h.opens_at.split(':').map(Number)
  const [ch, cm] = h.closes_at.split(':').map(Number)
  const open = new Date(now)
  open.setHours(oh, om, 0, 0)
  const close = new Date(now)
  close.setHours(ch, cm - 10, 0, 0)
  const start = new Date(Math.max(now.getTime() + (l.avg_prep_minutes + 10) * 60e3, open.getTime()))
  start.setMinutes(Math.ceil(start.getMinutes() / 10) * 10, 0, 0)
  const out: string[] = []
  for (let d = start; d <= close && out.length < 16; d = new Date(d.getTime() + 10 * 60e3)) out.push(d.toISOString())
  return out
})
watch(when, (w) => {
  if (w === 'asap') cart.pickupAt = null
  else if (!cart.pickupAt) cart.pickupAt = slots.value[0] ?? null
})

// ---------- промокод ----------
function applyPromo() {
  cart.promoCode = promoInput.value.trim().toUpperCase() || null
  tg.haptic.tap()
}
function clearPromo() {
  promoInput.value = ''
  cart.promoCode = null
}

const PAY_ICON: Record<PaymentMethod, unknown> = {
  card_online: CreditCard, sbp: Smartphone, telegram: Wallet, cash: Banknote, card_on_pickup: CreditCard,
}
const lineErrors = computed(() => new Map((q.value?.items ?? []).filter((i) => i.error).map((i) => [i.index, i.error])))

// ---------- оформление ----------
async function checkout() {
  if (!session.locationId || !q.value?.can_checkout) return
  placing.value = true
  tg.haptic.heavy()
  try {
    const res = await clientApi.createOrder(
      {
        location_id: session.locationId,
        items: cart.lines.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, modifier_ids: l.modifier_ids, quantity: l.quantity })),
        promo_code: cart.promoCode,
        use_gift: cart.useGift,
        pickup_at: cart.pickupAt,
        type: cart.orderType,
        payment_method: cart.paymentMethod,
        comment: cart.comment.trim() || null,
      },
      idemKey,
    )
    tg.haptic.success()
    cart.clear()
    idemKey = newIdempotencyKey()
    session.refreshProfile()
    if (res.payment_url) tg.openLink(res.payment_url)
    router.replace(`/orders/${res.order.id}`)
  } catch (e) {
    tg.haptic.error()
    toastError(e)
  } finally {
    placing.value = false
  }
}
</script>

<template>
  <main class="screen no-tabs">
    <h1 class="page-title">Корзина</h1>

    <UiEmpty v-if="!cart.lines.length" title="Пока пусто" text="Выберите что-нибудь в меню.">
      <UiButton @click="router.push('/menu')">Открыть меню</UiButton>
    </UiEmpty>

    <template v-else>
      <!-- позиции -->
      <section class="panel lines">
        <article v-for="(l, i) in cart.lines" :key="l.key" class="line">
          <ProductArt :slug="l.slug" :image-url="l.image_url" :size="64" />
          <div class="lmain">
            <p class="lname">{{ l.name }} <span class="lvar">{{ l.variant_name }}</span></p>
            <ul v-if="l.modifier_names.length" class="lmods"><li v-for="n in l.modifier_names" :key="n">+ {{ n }}</li></ul>
            <p v-if="lineErrors.get(i)" class="lerr">{{ lineErrors.get(i) }}</p>
            <div class="lbottom">
              <UiStepper :model-value="l.quantity" :min="0" size="sm" @update:model-value="(v: number) => cart.setQty(l.key, v)" />
              <span class="lprice num">{{ money(l.unit_price * l.quantity) }}</span>
            </div>
          </div>
          <button class="rm" aria-label="Убрать" @click="cart.setQty(l.key, 0)"><Trash2 :size="18" /></button>
        </article>
      </section>

      <!-- подарок -->
      <section v-if="q?.gift_available" class="gift" :class="{ on: cart.useGift, off: !q.gift_applicable }">
        <span class="gico"><Gift :size="22" /></span>
        <UiSwitch v-model="cart.useGift" :disabled="!q.gift_applicable">
          <span class="gtitle">Напиток в подарок</span>
          <span class="ghint">
            {{ q.gift_applicable ? 'Самый дорогой напиток будет бесплатным, добавки — по цене' : 'В корзине нет напитков, которые можно взять подарком' }}
          </span>
        </UiSwitch>
      </section>

      <!-- где и когда -->
      <section class="section">
        <h2 class="section-title">Где и когда</h2>
        <div class="panel">
          <button class="row" @click="locOpen = true">
            <MapPin :size="20" class="faint" />
            <span class="row-main">
              <span class="row-title">{{ loc?.name }}</span>
              <span class="row-sub">{{ loc?.address }}</span>
            </span>
            <span class="link">Сменить</span>
          </button>
        </div>
        <div class="stack">
          <UiSegmented
            v-model="cart.orderType"
            label="Как заберёте"
            :options="[
              { value: 'pickup', label: 'С собой' },
              { value: 'dine_in', label: 'В зале' },
            ]"
          />
          <UiSegmented
            v-model="when"
            label="Время"
            :options="[
              { value: 'asap', label: 'Как можно скорее', hint: `~${loc?.avg_prep_minutes ?? 7} мин` },
              { value: 'later', label: 'Ко времени', hint: slots.length ? 'сегодня' : 'нет слотов', disabled: !slots.length },
            ]"
          />
          <div v-if="when === 'later'" class="slots scroll-x">
            <button
              v-for="s in slots"
              :key="s"
              class="slot num"
              :class="{ on: cart.pickupAt === s }"
              @click="(cart.pickupAt = s), tg.haptic.select()"
            >
              {{ time(s) }}
            </button>
          </div>
        </div>
      </section>

      <!-- оплата -->
      <section class="section">
        <h2 class="section-title">Оплата</h2>
        <div class="panel pays" role="radiogroup" aria-label="Способ оплаты">
          <button
            v-for="m in loc?.payment_methods ?? []"
            :key="m"
            class="row pay"
            role="radio"
            :aria-checked="cart.paymentMethod === m"
            @click="(cart.paymentMethod = m), tg.haptic.select()"
          >
            <component :is="PAY_ICON[m]" :size="20" class="faint" />
            <span class="row-main"><span class="row-title">{{ PAYMENT_LABEL[m] }}</span></span>
            <span class="radio" :class="{ on: cart.paymentMethod === m }" />
          </button>
        </div>
      </section>

      <!-- промокод и комментарий -->
      <section class="section stack">
        <div class="promo">
          <UiField
            v-model="promoInput"
            label="Промокод"
            placeholder="COFFEE10"
            mono
            style="text-transform: uppercase"
            :error="cart.promoCode ? q?.promo_error : null"
            :hint="cart.promoCode && !q?.promo_error && q?.promo_discount ? `Скидка ${money(q.promo_discount)}` : undefined"
            @keyup.enter="applyPromo"
          />
          <UiButton v-if="cart.promoCode && cart.promoCode === promoInput.trim().toUpperCase()" variant="secondary" @click="clearPromo">Убрать</UiButton>
          <UiButton v-else variant="secondary" :disabled="!promoInput.trim()" @click="applyPromo">Применить</UiButton>
        </div>
        <UiField v-model="cart.comment" label="Комментарий бариста" placeholder="Без крышки, погорячее…" multiline :rows="2" :maxlength="500" />
      </section>

      <!-- итог -->
      <section class="section panel sum">
        <div class="srow"><span>Товары</span><span class="num">{{ money(q?.subtotal ?? cart.localTotal) }}</span></div>
        <div v-if="q?.gift_discount" class="srow gift-r"><span>Напиток в подарок</span><span class="num">−{{ money(q.gift_discount) }}</span></div>
        <div v-if="q?.promo_discount" class="srow"><span>Промокод {{ cart.promoCode }}</span><span class="num">−{{ money(q.promo_discount) }}</span></div>
        <div class="srow total"><span>Итого</span><span class="num">{{ money(cart.total) }}</span></div>
        <p v-if="q?.stamps_to_earn" class="earn">
          После выдачи заказа получите {{ q.stamps_to_earn }} {{ plural(q.stamps_to_earn, 'штамп', 'штампа', 'штампов') }}
        </p>
        <p v-for="w in q?.warnings ?? []" :key="w" class="warn">{{ w }}</p>
        <p v-if="cart.quoteError" class="warn">{{ cart.quoteError }}</p>
      </section>

      <div class="sticky-cta">
        <UiButton size="lg" block :loading="placing" :disabled="cart.quoting || !q?.can_checkout" @click="checkout">
          <span>{{ ['card_online', 'sbp', 'telegram'].includes(cart.paymentMethod) ? 'Оплатить' : 'Заказать' }}</span>
          <span class="num">{{ money(cart.total) }}</span>
        </UiButton>
      </div>
    </template>

    <LocationSheet :open="locOpen" @close="locOpen = false" />
  </main>
</template>

<style scoped>
.lines {
  padding: 4px 14px;
}
.line {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  align-items: flex-start;
}
.line + .line {
  border-top: 1px solid var(--line);
}
.lmain {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
}
.lname {
  font-weight: 600;
}
.lvar {
  color: var(--ink-3);
  font-weight: 500;
}
.lmods {
  font-size: var(--fs-13);
  color: var(--ink-2);
  display: grid;
  gap: 1px;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
}

.lerr {
  font-size: var(--fs-13);
  color: var(--danger);
  font-weight: 500;
}
.lbottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
}
.lprice {
  font-weight: 600;
}
.rm {
  color: var(--ink-3);
  padding: 4px;
}
.gift {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: var(--r-card);
  background: var(--crema-soft);
  border: 2px dashed color-mix(in oklab, var(--crema) 60%, transparent);
}
.gift.on {
  border-style: solid;
  border-color: var(--crema);
}
.gift.off {
  opacity: 0.7;
}
.gift :deep(.sw) {
  flex: 1;
}
.gico {
  flex: none;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--crema);
  color: #3b2a0c;
}
.gtitle {
  font-weight: 700;
  color: var(--crema-ink);
}
.ghint {
  font-size: var(--fs-13);
  color: var(--ink-2);
}
.section .section-title {
  margin-bottom: 10px;
}
.stack {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}
.section.stack {
  gap: 14px;
}
.slots {
  gap: 6px;
}
.slot {
  flex: none;
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  background: var(--surface);
  font-size: var(--fs-15);
  border: 2px solid transparent;
}
.slot.on {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.pay {
  width: 100%;
  text-align: left;
}
.radio {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--surface-3);
  transition: border 0.15s;
}
.radio.on {
  border: 7px solid var(--primary);
}
.promo {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.promo :deep(.field) {
  flex: 1;
}
.promo .btn {
  margin-top: 25px;
  height: 46px;
}
.sum {
  padding: 14px 16px;
  display: grid;
  gap: 8px;
}
.srow {
  display: flex;
  justify-content: space-between;
  color: var(--ink-2);
}
.gift-r {
  color: var(--crema-ink);
  font-weight: 600;
}
.total {
  color: var(--ink);
  font-weight: 700;
  font-size: var(--fs-17);
  padding-top: 8px;
  border-top: 1px solid var(--line);
}
.earn {
  font-size: var(--fs-13);
  color: var(--stamp);
  font-weight: 600;
}
.warn {
  font-size: var(--fs-13);
  color: var(--warn);
  font-weight: 500;
}
.sticky-cta :deep(.btn) {
  justify-content: space-between;
}
</style>
