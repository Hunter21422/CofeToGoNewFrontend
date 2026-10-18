<script setup lang="ts">
import { QrCode, RefreshCw } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { clientApi } from '@/shared/api/client'
import type { LoyaltyQrOut, LoyaltyTransactionRead } from '@/shared/api/types'
import QrCode2 from '@/shared/components/QrCode.vue'
import StampCard from '@/shared/components/StampCard.vue'
import UiSegmented from '@/shared/components/UiSegmented.vue'
import UiSkeleton from '@/shared/components/UiSkeleton.vue'
import { useNow, usePolling } from '@/shared/composables/usePolling'
import { toast } from '@/shared/composables/useToast'
import { tg } from '@/shared/telegram'
import { TX_LABEL, when } from '@/shared/utils/format'
import { useSession } from '../stores/session'

const session = useSession()
const qr = ref<LoyaltyQrOut | null>(null)
const mode = ref<'code' | 'qr'>('code')
const history = ref<LoyaltyTransactionRead[]>([])
const historyLoading = ref(true)
const now = useNow(1000)
let refreshTimer: ReturnType<typeof setTimeout>

async function loadQr() {
  clearTimeout(refreshTimer)
  try {
    qr.value = await clientApi.loyaltyQr()
    refreshTimer = setTimeout(loadQr, qr.value.refresh_in * 1000)
  } catch {
    refreshTimer = setTimeout(loadQr, 5000)
  }
}
async function loadHistory() {
  const h = await clientApi.loyaltyHistory({ limit: 15 })
  history.value = h.items
  historyLoading.value = false
}

// Бариста начислил штамп на кассе — карта обновится сама и штамп «пробьётся»
const prevStamps = ref(session.loyalty?.stamps ?? 0)
const prevGifts = ref(session.loyalty?.gifts_available ?? 0)
usePolling(async () => {
  await session.refreshLoyalty()
  const l = session.loyalty!
  if (l.stamps !== prevStamps.value || l.gifts_available !== prevGifts.value) {
    const gained = l.stamps > prevStamps.value || l.gifts_available > prevGifts.value
    const spent = l.gifts_available < prevGifts.value
    if (gained) {
      tg.haptic.success()
      toast(l.gifts_available > prevGifts.value ? 'Подарок открыт! Следующий напиток за наш счёт' : 'Штамп поставлен', 'ok')
    } else if (spent) toast('Подарок получен. Приятного кофе!', 'ok')
    prevStamps.value = l.stamps
    prevGifts.value = l.gifts_available
    loadHistory()
    loadQr()
  }
}, 4000)

onMounted(() => {
  loadQr()
  loadHistory()
})
onBeforeUnmount(() => clearTimeout(refreshTimer))

const secondsLeft = computed(() => (qr.value ? Math.max(0, Math.round((new Date(qr.value.expires_at).getTime() - now.value) / 1000)) : 0))
const mmss = computed(() => `${Math.floor(secondsLeft.value / 60)}:${String(secondsLeft.value % 60).padStart(2, '0')}`)
const digits = computed(() => (qr.value?.code ?? '').split(''))
watch(secondsLeft, (s) => s === 0 && qr.value && loadQr())
const tierLabel = computed(() => ({ base: 'Гость', silver: 'Постоянный гость', gold: 'Свой человек' })[session.loyalty?.tier ?? 'base'])
</script>

<template>
  <main class="screen">
    <h1 class="page-title">Карта гостя</h1>

    <StampCard
      v-if="session.loyalty"
      :stamps="session.loyalty.stamps"
      :per-gift="session.loyalty.stamps_per_gift"
      :gifts="session.loyalty.gifts_available"
    />

    <section class="section code-panel">
      <UiSegmented
        v-model="mode"
        size="sm"
        label="Как показать"
        :options="[
          { value: 'code', label: 'Код' },
          { value: 'qr', label: 'QR' },
        ]"
      />

      <div v-if="!qr" class="code-sk"><UiSkeleton w="80%" h="64px" r="14px" /></div>

      <template v-else-if="mode === 'code'">
        <p class="hint">Назовите код бариста после покупки — он поставит штамп</p>
        <p class="code num" :aria-label="`Код ${qr.code.split('').join(' ')}`">
          <span v-for="(d, i) in digits" :key="i" class="digit" :class="{ gap: i === 2 }">{{ d }}</span>
        </p>
      </template>

      <template v-else>
        <p class="hint"><QrCode :size="15" /> Покажите QR на кассе</p>
        <div class="qr-wrap"><QrCode2 :value="qr.token" :size="200" /></div>
      </template>

      <p v-if="qr" class="ttl">
        <RefreshCw :size="13" />
        Код обновится через <span class="num">{{ mmss }}</span>
      </p>
    </section>

    <section v-if="session.loyalty" class="section stats">
      <div class="stat">
        <span class="sv num">{{ session.loyalty.lifetime_stamps }}</span>
        <span class="sl">штампов за всё время</span>
      </div>
      <div class="stat">
        <span class="sv num">{{ session.loyalty.lifetime_gifts }}</span>
        <span class="sl">напитков в подарок</span>
      </div>
      <div class="stat">
        <span class="sv tier">{{ tierLabel }}</span>
        <span class="sl">ваш статус</span>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title hist-title">История</h2>
      <div v-if="historyLoading" class="panel"><UiSkeleton v-for="i in 4" :key="i" h="40px" style="margin: 10px 0" /></div>
      <p v-else-if="!history.length" class="muted">Здесь появятся штампы и подарки после первого заказа.</p>
      <div v-else class="panel">
        <div v-for="t in history" :key="t.id" class="row">
          <span class="txd num" :class="{ plus: t.stamps_delta > 0 || t.gifts_delta > 0, gift: t.gifts_delta !== 0 }">
            <template v-if="t.gifts_delta > 0">+🎁</template>
            <template v-else-if="t.gifts_delta < 0">🎁</template>
            <template v-else>{{ t.stamps_delta > 0 ? '+' : '' }}{{ t.stamps_delta }}</template>
          </span>
          <span class="row-main">
            <span class="row-title">{{ TX_LABEL[t.type] }}</span>
            <span class="row-sub">{{ when(t.created_at) }}<template v-if="t.reason">, {{ t.reason.toLowerCase() }}</template></span>
          </span>
          <span class="after num faint">{{ t.stamps_after }}/{{ session.loyalty?.stamps_per_gift }}</span>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.code-panel {
  display: grid;
  gap: 14px;
  justify-items: center;
  padding: 16px;
  border-radius: var(--r-card);
  background: var(--surface);
}
.code-panel > :first-child {
  width: 100%;
}
.code-sk {
  width: 100%;
  display: grid;
  place-items: center;
  padding: 18px 0;
}
.hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-13);
  color: var(--ink-2);
  text-align: center;
}
.code {
  display: flex;
  gap: 6px;
  font-size: var(--fs-48);
  font-weight: 700;
  line-height: 1;
}
.digit {
  display: grid;
  place-items: center;
  width: 0.92em;
  height: 1.36em;
  border-radius: 12px;
  background: var(--surface-2);
}
.digit.gap {
  margin-right: 10px;
}
.qr-wrap {
  padding: 14px;
  border-radius: 18px;
  background: #fff;
}
.ttl {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-13);
  color: var(--ink-3);
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.stat {
  display: grid;
  gap: 4px;
  align-content: start;
  padding: 14px 12px;
  border-radius: 16px;
  background: var(--surface);
}
.sv {
  font-size: var(--fs-24);
  font-weight: 700;
}
.sv.tier {
  font-family: var(--font-display);
  font-size: var(--fs-13);
  line-height: 1.25;
  min-height: 1.85rem;
  display: flex;
  align-items: center;
}
.sl {
  font-size: var(--fs-11);
  color: var(--ink-3);
  line-height: 1.3;
}
.hist-title {
  margin-bottom: 10px;
}
.txd {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: var(--fs-15);
  background: var(--surface-2);
  color: var(--ink-2);
}
.txd.plus {
  background: var(--stamp-soft);
  color: var(--stamp);
}
.txd.gift {
  background: var(--crema-soft);
  color: var(--crema-ink);
  font-size: var(--fs-13);
}
.after {
  font-size: var(--fs-13);
}
</style>
