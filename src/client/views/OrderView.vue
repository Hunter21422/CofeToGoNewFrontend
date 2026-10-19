<script setup lang="ts">
import { Check, MapPin, Star } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { clientApi } from '@/shared/api/client'
import { ACTIVE_STATUSES, type OrderRead, type OrderStatus, type ReviewTag } from '@/shared/api/types'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSkeleton from '@/shared/components/UiSkeleton.vue'
import { useNow, usePolling } from '@/shared/composables/usePolling'
import { toast, toastError } from '@/shared/composables/useToast'
import { tg } from '@/shared/telegram'
import { minutesUntil, money, PAYMENT_LABEL, plural, STATUS_LABEL, time, when } from '@/shared/utils/format'
import { useSession } from '../stores/session'
import { PUSH_DENIED_HELP, PUSH_DISMISSED_HELP, usePush } from '../composables/usePush'

const props = defineProps<{ id: string }>()
const router = useRouter()
const session = useSession()
const order = ref<OrderRead | null>(null)
const notFound = ref(false)
const cancelling = ref(false)
const now = useNow(15000)
const push = usePush()
push.check()
async function enablePush() {
  try {
    const r = await push.enable()
    if (r === 'ok') toast('Сообщим, когда заказ будет готов', 'ok')
    else toast(r === 'denied' ? PUSH_DENIED_HELP : PUSH_DISMISSED_HELP, 'error')
  } catch (e) {
    toastError(e)
  }
}

async function load() {
  try {
    const o = await clientApi.order(Number(props.id))
    const prev = order.value?.status
    order.value = o
    if (prev && prev !== o.status) {
      if (o.status === 'ready') tg.haptic.success()
      else tg.haptic.soft()
      if (o.status === 'completed') session.refreshLoyalty()
    }
  } catch {
    notFound.value = true
  }
}
// бариста меняет статус в админке — здесь подхватываем
const poll = usePolling(load, 3000)
watch(
  () => order.value?.status,
  (s) => s && !ACTIVE_STATUSES.includes(s) && s !== 'pending_payment' && poll.stop(),
)

const FLOW: { s: OrderStatus; title: string; text: string }[] = [
  { s: 'new', title: 'Отправлен', text: 'Кофейня видит заказ' },
  { s: 'accepted', title: 'Принят', text: 'Бариста взял его в работу' },
  { s: 'preparing', title: 'Готовим', text: 'Варим и взбиваем' },
  { s: 'ready', title: 'Готов', text: 'Ждёт вас на стойке выдачи' },
  { s: 'completed', title: 'Выдан', text: 'Приятного кофе' },
]
const stepIndex = computed(() => FLOW.findIndex((f) => f.s === order.value?.status))
const isFinalBad = computed(() => ['cancelled', 'rejected', 'expired'].includes(order.value?.status ?? ''))
const stampedAt = (s: OrderStatus) => order.value?.status_history.find((h) => h.to_status === s)?.created_at

const headline = computed(() => {
  const o = order.value
  if (!o) return ''
  if (o.status === 'ready') return 'Готов — заберите на стойке'
  if (o.status === 'completed') return 'Заказ выдан'
  if (isFinalBad.value) return STATUS_LABEL[o.status]
  const m = minutesUntil(o.estimated_ready_at, now.value)
  if (m != null && m > 0) return `Будет готов через ${m} ${plural(m, 'минуту', 'минуты', 'минут')}`
  return 'Почти готово'
})

async function cancel() {
  if (!order.value) return
  if (!(await tg.confirm('Отменить заказ? Если вы платили онлайн, деньги вернутся на карту.'))) return
  cancelling.value = true
  try {
    order.value = await clientApi.cancelOrder(order.value.id)
    toast('Заказ отменён', 'ok')
    session.refreshProfile()
  } catch (e) {
    toastError(e)
  } finally {
    cancelling.value = false
  }
}

// ---------- отзыв ----------
const rating = ref(0)
const tags = ref<ReviewTag[]>([])
const comment = ref('')
const sending = ref(false)
const sent = ref(false)
const TAGS: Record<'good' | 'bad', { v: ReviewTag; l: string }[]> = {
  good: [{ v: 'tasty', l: 'Вкусно' }, { v: 'fast', l: 'Быстро' }, { v: 'friendly', l: 'Приветливо' }],
  bad: [{ v: 'slow', l: 'Долго' }, { v: 'cold', l: 'Остыло' }, { v: 'wrong_order', l: 'Перепутали' }],
}
function toggleTag(t: ReviewTag) {
  tags.value = tags.value.includes(t) ? tags.value.filter((x) => x !== t) : [...tags.value, t]
}
async function sendReview() {
  if (!order.value || !rating.value) return
  sending.value = true
  try {
    await clientApi.reviewOrder(order.value.id, { rating: rating.value, tags: tags.value, comment: comment.value.trim() || null })
    sent.value = true
    tg.haptic.success()
  } catch (e) {
    toastError(e)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <main class="screen no-tabs">
    <div v-if="notFound" class="nf">
      <h1 class="page-title">Заказ не найден</h1>
      <UiButton @click="router.replace('/orders')">Все заказы</UiButton>
    </div>

    <template v-else-if="!order">
      <UiSkeleton w="40%" h="72px" r="12px" />
      <div style="height: 16px" />
      <UiSkeleton h="220px" r="20px" />
    </template>

    <template v-else>
      <header class="hero" :class="order.status">
        <p class="label">Заказ</p>
        <p class="number num" aria-label="Номер заказа">{{ order.display_number }}</p>
        <h1 class="headline">{{ headline }}</h1>
        <p class="where"><MapPin :size="15" /> {{ order.location.name }}, {{ order.location.address }}</p>
      </header>

      <section v-if="!isFinalBad" class="panel steps" aria-label="Статус заказа">
        <ol>
          <li
            v-for="(f, i) in FLOW"
            :key="f.s"
            class="step"
            :class="{ done: i < stepIndex, current: i === stepIndex, todo: i > stepIndex }"
            :aria-current="i === stepIndex ? 'step' : undefined"
          >
            <span class="mark"><Check v-if="i < stepIndex || (i === stepIndex && f.s === 'completed')" :size="14" :stroke-width="3" /></span>
            <span class="stext">
              <span class="stitle">{{ f.title }}</span>
              <span v-if="i === stepIndex" class="sdesc">{{ f.text }}</span>
            </span>
            <span class="stime num">{{ time(stampedAt(f.s)) }}</span>
          </li>
        </ol>
      </section>
      <p v-else class="bad panel">
        {{ order.status === 'rejected' ? 'Кофейня не сможет приготовить этот заказ.' : 'Заказ отменён.' }}
        <template v-if="order.payment_status === 'refunded'"> Деньги вернутся на карту в течение нескольких дней.</template>
        <template v-if="order.gift_used"> Подарок вернули на карту гостя.</template>
      </p>

      <section v-if="push.supported && !push.needsInstall && !push.enabled.value && !push.denied.value && ACTIVE_STATUSES.includes(order.status)" class="section panel push-ask">
        <div>
          <h2 class="section-title">Сообщить, когда будет готово?</h2>
          <p class="muted">Пришлём уведомление, даже если закроете сайт.</p>
        </div>
        <UiButton :loading="push.busy.value" @click="enablePush">Включить</UiButton>
      </section>

      <!-- отзыв -->
      <section v-if="order.can_review && !sent" class="section panel review">
        <h2 class="section-title">Как всё прошло?</h2>
        <div class="stars" role="radiogroup" aria-label="Оценка">
          <button
            v-for="n in 5"
            :key="n"
            role="radio"
            :aria-checked="rating === n"
            :aria-label="`${n} из 5`"
            :class="{ on: n <= rating }"
            @click="(rating = n), tg.haptic.select()"
          >
            <Star :size="32" :fill="n <= rating ? 'currentColor' : 'none'" />
          </button>
        </div>
        <template v-if="rating">
          <div class="rtags">
            <button
              v-for="t in TAGS[rating >= 4 ? 'good' : 'bad']"
              :key="t.v"
              class="rtag"
              :class="{ on: tags.includes(t.v) }"
              @click="toggleTag(t.v)"
            >
              {{ t.l }}
            </button>
          </div>
          <UiField v-model="comment" multiline :rows="2" placeholder="Пара слов для команды — по желанию" />
          <UiButton block :loading="sending" @click="sendReview">Отправить отзыв</UiButton>
        </template>
      </section>
      <p v-if="sent" class="section thanks">Спасибо! Команда прочитает отзыв сегодня.</p>

      <section class="section panel items">
        <div v-for="i in order.items" :key="i.id" class="item">
          <span class="iq num">{{ i.quantity }}×</span>
          <span class="imain">
            <span class="iname">{{ i.product_name }} <span class="faint">{{ i.variant_name }}</span></span>
            <ul v-if="i.modifiers.length" class="imods"><li v-for="m in i.modifiers" :key="m.id">+ {{ m.name }}</li></ul>
            <span v-if="i.is_gift" class="igift">в подарок</span>
          </span>
          <span class="iprice num">{{ money(i.line_total) }}</span>
        </div>
        <div class="tot">
          <div v-if="order.discount_total" class="trow"><span>Скидка</span><span class="num">−{{ money(order.discount_total) }}</span></div>
          <div class="trow big"><span>Итого</span><span class="num">{{ money(order.total) }}</span></div>
          <div class="trow faint"><span>{{ PAYMENT_LABEL[order.payment_method] }}</span><span>{{ order.payment_status === 'paid' ? 'оплачено' : order.payment_status === 'refunded' ? 'возвращено' : 'оплата на месте' }}</span></div>
        </div>
        <p v-if="order.comment" class="ocomment">«{{ order.comment }}»</p>
      </section>

      <p v-if="order.status === 'completed'" class="earned">
        Штампы за напитки из этого заказа уже на карте.
        <RouterLink to="/card" class="link">Открыть карту</RouterLink>
      </p>

      <p class="created faint">Оформлен {{ when(order.created_at) }}</p>

      <div v-if="order.can_cancel" class="cancel">
        <UiButton variant="danger" block :loading="cancelling" @click="cancel">Отменить заказ</UiButton>
        <p class="faint">Пока бариста не принял заказ, его можно отменить.</p>
      </div>
    </template>
  </main>
</template>

<style scoped>
.hero {
  padding: 8px 0 20px;
}
.label {
  font-size: var(--fs-13);
  color: var(--ink-3);
  font-weight: 600;
}
.number {
  font-size: var(--fs-72);
  font-weight: 700;
  line-height: 1;
  margin: 2px 0 10px;
  letter-spacing: -0.04em;
}
.hero.ready .number {
  color: var(--ok);
}
.hero.cancelled .number,
.hero.rejected .number,
.hero.expired .number {
  color: var(--ink-3);
  text-decoration: line-through;
  text-decoration-thickness: 4px;
}
.headline {
  font-size: var(--fs-20);
}
.where {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: var(--ink-2);
  font-size: var(--fs-13);
}
.steps {
  padding: 16px;
}
.steps ol {
  list-style: none;
  margin: 0;
  padding: 0;
}
.step {
  position: relative;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding-bottom: 18px;
}
.step:last-child {
  padding-bottom: 0;
}
.step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 11px;
  top: 26px;
  bottom: 2px;
  width: 2px;
  background: var(--line);
}
.step.done:not(:last-child)::after {
  background: var(--primary);
}
.mark {
  flex: none;
  position: relative;
  z-index: 1;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 2px solid var(--surface-3);
  background: var(--surface);
  color: var(--on-primary);
}
.done .mark {
  background: var(--primary);
  border-color: var(--primary);
}
.current .mark {
  border-color: var(--primary);
  box-shadow: 0 0 0 5px var(--primary-soft);
}
.current .mark::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  animation: beat 1.4s ease-in-out infinite;
}
.current:last-child .mark {
  background: var(--primary);
}
.current:last-child .mark::after {
  display: none;
}
@keyframes beat {
  50% {
    transform: scale(0.6);
    opacity: 0.6;
  }
}
.stext {
  flex: 1;
  display: grid;
  gap: 2px;
  padding-top: 1px;
}
.stitle {
  font-weight: 600;
}
.todo .stitle {
  color: var(--ink-3);
  font-weight: 500;
}
.sdesc {
  font-size: var(--fs-13);
  color: var(--ink-2);
}
.stime {
  font-size: var(--fs-13);
  color: var(--ink-3);
  padding-top: 2px;
}
.bad {
  padding: 16px;
  color: var(--ink-2);
}
.review {
  padding: 16px;
  display: grid;
  gap: 14px;
}
.stars {
  display: flex;
  gap: 6px;
}
.stars button {
  color: var(--surface-3);
}
.stars button.on {
  color: var(--crema);
}
.rtags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.rtag {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--r-pill);
  background: var(--surface-2);
  font-weight: 500;
}
.rtag.on {
  background: var(--primary-soft);
  color: var(--primary);
}
.thanks {
  color: var(--ok);
  font-weight: 600;
}
.items {
  padding: 8px 16px 14px;
}
.item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
.iq {
  color: var(--ink-3);
  font-size: var(--fs-13);
  padding-top: 2px;
  width: 22px;
}
.imain {
  flex: 1;
  display: grid;
  gap: 2px;
}
.iname {
  font-weight: 500;
}
.imods {
  font-size: var(--fs-13);
  color: var(--ink-2);
  display: grid;
  gap: 1px;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
}

.igift {
  font-size: var(--fs-13);
  color: var(--crema-ink);
  font-weight: 600;
}
.tot {
  display: grid;
  gap: 6px;
  padding-top: 12px;
}
.trow {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-13);
  color: var(--ink-2);
}
.trow.big {
  font-size: var(--fs-17);
  font-weight: 700;
  color: var(--ink);
}
.ocomment {
  margin-top: 10px;
  font-size: var(--fs-13);
  color: var(--ink-2);
}
.earned {
  margin-top: 14px;
  padding: 12px 16px;
  border-radius: var(--r-card);
  background: var(--stamp-soft);
  color: var(--stamp);
  font-weight: 500;
}
.created {
  margin-top: 16px;
  font-size: var(--fs-13);
  text-align: center;
}
.cancel {
  margin-top: 24px;
  display: grid;
  gap: 8px;
  text-align: center;
  font-size: var(--fs-13);
}
.push-ask {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.push-ask .section-title {
  margin: 0 0 4px;
}
.push-ask p {
  margin: 0;
  font-size: var(--fs-13);
}
</style>
