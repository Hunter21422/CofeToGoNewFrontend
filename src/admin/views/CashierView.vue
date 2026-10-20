<script setup lang="ts">
import { Delete, QrCode, Search } from 'lucide-vue-next'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { adminApi } from '@/shared/api/admin'
import { ApiError } from '@/shared/api/http'
import type { CustomerSearchItem, ScanResultOut } from '@/shared/api/types'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSegmented from '@/shared/components/UiSegmented.vue'
import { tg } from '@/shared/telegram'
import { initials, phone as fmtPhone } from '@/shared/utils/format'
import GuestPanel from '../components/GuestPanel.vue'
import { useAdmin } from '../stores/admin'

const admin = useAdmin()
const mode = ref<'code' | 'search' | 'qr'>('code')
const code = ref('')
const codeError = ref<string | null>(null)
const checking = ref(false)
const guest = ref<(ScanResultOut & { via: string }) | null>(null)
const codeInput = ref<HTMLInputElement | null>(null)

// ---------- код ----------
const digits = computed(() => code.value.padEnd(6, ' ').slice(0, 6).split(''))
function press(d: string) {
  codeError.value = null
  if (code.value.length < 6) code.value += d
  tg.haptic.select()
}
function back() {
  code.value = code.value.slice(0, -1)
  codeError.value = null
}
function onType(e: Event) {
  code.value = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6)
  codeError.value = null
}
watch(code, (v) => v.length === 6 && checkCode())
async function checkCode() {
  if (code.value.length !== 6 || !admin.locationId || checking.value) return
  checking.value = true
  try {
    const r = await adminApi.checkCode(code.value, admin.locationId)
    guest.value = { ...r, via: 'Код подтверждён' }
    tg.haptic.success()
    code.value = ''
  } catch (e) {
    tg.haptic.error()
    codeError.value = e instanceof ApiError ? e.message : 'Не удалось проверить код'
  } finally {
    checking.value = false
  }
}
function onKey(e: KeyboardEvent) {
  if (mode.value !== 'code' || guest.value) return
  if (/^\d$/.test(e.key) && document.activeElement !== codeInput.value) press(e.key)
  if (e.key === 'Backspace' && document.activeElement !== codeInput.value) back()
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  nextTick(() => codeInput.value?.focus())
})

// ---------- поиск ----------
const q = ref('')
const results = ref<CustomerSearchItem[]>([])
const searching = ref(false)
let t: ReturnType<typeof setTimeout>
watch(q, (v) => {
  clearTimeout(t)
  if (v.trim().length < 2) return (results.value = [])
  t = setTimeout(async () => {
    searching.value = true
    try {
      results.value = await adminApi.searchGuest(v.trim())
    } finally {
      searching.value = false
    }
  }, 250)
})
async function pickResult(r: CustomerSearchItem) {
  const d = await adminApi.customer(r.user.id)
  guest.value = { user: r.user, phone: r.phone, loyalty: d.loyalty, last_orders: d.last_orders.slice(0, 5), via: 'Найден по поиску', visit: null }
}

// ---------- QR ----------
const token = ref('')
const qrError = ref<string | null>(null)
async function scan() {
  qrError.value = null
  const v = await tg.scanQr('Наведите на QR гостя в приложении')
  if (v) {
    token.value = v
    await checkToken()
  } else if (!tg.inTelegram) qrError.value = 'Сканер работает в Telegram. Здесь можно вставить содержимое QR вручную.'
}
async function checkToken() {
  if (!token.value.trim() || !admin.locationId) return
  try {
    const r = await adminApi.scan(token.value.trim(), admin.locationId)
    guest.value = { ...r, via: 'QR подтверждён' }
    token.value = ''
    tg.haptic.success()
  } catch (e) {
    qrError.value = e instanceof ApiError ? e.message : 'QR не распознан'
  }
}

function closeGuest() {
  guest.value = null
  nextTick(() => codeInput.value?.focus())
}
</script>

<template>
  <main class="page">
    <header class="page-head"><h1>Касса</h1></header>

    <div class="layout" :class="{ has: !!guest }">
      <section class="card finder">
        <UiSegmented
          v-model="mode"
          :options="[
            { value: 'code', label: 'Код гостя' },
            { value: 'search', label: 'Ник или телефон' },
            { value: 'qr', label: 'QR' },
          ]"
        />

        <!-- 6 цифр -->
        <div v-if="mode === 'code'" class="code-mode">
          <p class="muted">Гость открывает карту в приложении и называет 6 цифр. Код живёт 5 минут и сгорает после проверки.</p>
          <label class="code-box" :class="{ err: !!codeError, busy: checking }">
            <span class="visually-hidden">Код гостя</span>
            <input
              ref="codeInput"
              :value="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              class="code-input"
              @input="onType"
            />
            <template v-for="(d, i) in digits" :key="i">
              <span class="cell num" :class="{ filled: d.trim(), cur: i === code.length }">{{ d }}</span>
              <span v-if="i === 2" class="sp" aria-hidden="true" />
            </template>
          </label>
          <p v-if="codeError" class="cerr">{{ codeError }}</p>
          <div class="pad" aria-label="Цифровая клавиатура">
            <button v-for="d in ['1', '2', '3', '4', '5', '6', '7', '8', '9']" :key="d" class="key num" @click="press(d)">{{ d }}</button>
            <button class="key fn" aria-label="Стереть цифру" @click="back"><Delete :size="22" /></button>
            <button class="key num" @click="press('0')">0</button>
            <button class="key fn" :disabled="code.length < 6" @click="checkCode">ОК</button>
          </div>
        </div>

        <!-- поиск -->
        <div v-else-if="mode === 'search'" class="search-mode">
          <UiField v-model="q" placeholder="@username, телефон или имя" autocomplete="off" inputmode="search">
            <template #prefix><Search :size="18" class="faint" /></template>
          </UiField>
          <p v-if="q.trim().length >= 2 && !searching && !results.length" class="muted small">Никого не нашли. Проверьте ник без опечаток или попросите код из приложения.</p>
          <div class="results">
            <button v-for="r in results" :key="r.user.id" class="res" @click="pickResult(r)">
              <span class="ava">{{ initials(r.user.first_name, r.user.last_name) }}</span>
              <span class="rw">
                <span class="rn">{{ r.user.first_name }} {{ r.user.last_name }}</span>
                <span class="rm">
                  <template v-if="r.user.username">@{{ r.user.username }}</template>
                  <template v-if="r.user.username && r.phone">, </template>
                  <template v-if="r.phone">{{ fmtPhone(r.phone) }}</template>
                </span>
              </span>
              <span class="rs num">{{ r.loyalty.stamps }}/{{ r.loyalty.stamps_per_gift }}<template v-if="r.loyalty.gifts_available"> 🎁</template></span>
            </button>
          </div>
          <p class="muted small">Поиск — только посмотреть карту. Штамп и подарок ставятся по коду или QR из приложения: так видно, что гость перед вами.</p>
        </div>

        <!-- QR -->
        <div v-else class="qr-mode">
          <UiButton size="lg" block @click="scan"><QrCode :size="20" /> Сканировать QR</UiButton>
          <div class="or"><span>или</span></div>
          <div class="manual">
            <UiField v-model="token" placeholder="Содержимое QR" :error="qrError" @keyup.enter="checkToken" />
            <UiButton variant="secondary" :disabled="!token.trim()" @click="checkToken">Проверить</UiButton>
          </div>
        </div>
      </section>

      <section class="card result">
        <GuestPanel
          v-if="guest"
          :key="guest.user.id + guest.via"
          :user="guest.user"
          :phone="guest.phone"
          :loyalty="guest.loyalty"
          :last-orders="guest.last_orders"
          :via="guest.via"
          :visit="guest.visit ?? null"
          @close="closeGuest"
        />
        <div v-else class="placeholder">
          <svg viewBox="0 0 64 64" width="56" aria-hidden="true">
            <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" stroke-width="3" />
            <circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 3" />
            <ellipse cx="32" cy="32" rx="8" ry="12" fill="currentColor" transform="rotate(-28 32 32)" />
          </svg>
          <p>Здесь появится карта гостя. Введите код, найдите по нику или отсканируйте QR.</p>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(320px, 440px) minmax(320px, 520px);
  gap: 16px;
  align-items: start;
}
.finder {
  display: grid;
  gap: 16px;
  padding: 18px;
}
.code-mode {
  display: grid;
  gap: 14px;
}
.code-box {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr) 2px repeat(3, 1fr);
  gap: 8px;
  cursor: text;
}
.code-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  font-size: 16px;
}
.cell {
  aspect-ratio: 0.82;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: var(--surface-2);
  font-size: var(--fs-32);
  font-weight: 700;
  border: 2px solid transparent;
  transition: border-color 0.12s;
}
.code-box:focus-within .cell.cur {
  border-color: var(--primary);
}
.cell.filled {
  background: var(--surface-3);
}
.code-box.err .cell {
  border-color: var(--danger);
  animation: shake 0.3s;
}
.code-box.busy .cell {
  opacity: 0.6;
}
@keyframes shake {
  30% {
    transform: translateX(-4px);
  }
  60% {
    transform: translateX(4px);
  }
}
.cerr {
  color: var(--danger);
  font-weight: 600;
  font-size: var(--fs-13);
}
.pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.key {
  height: 60px;
  border-radius: 14px;
  background: var(--surface-2);
  font-size: var(--fs-24);
  font-weight: 600;
  display: grid;
  place-items: center;
  transition: background-color 0.1s;
}
.key:active {
  background: var(--surface-3);
}
.key.fn {
  font-family: var(--font-body);
  font-size: var(--fs-17);
  font-weight: 700;
  color: var(--ink-2);
}
.key.fn:last-child:not(:disabled) {
  background: var(--primary);
  color: var(--on-primary);
}
.key:disabled {
  opacity: 0.5;
}
.search-mode {
  display: grid;
  gap: 12px;
}
.small {
  font-size: var(--fs-13);
}
.results {
  display: grid;
  gap: 6px;
}
.res {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--surface-2);
  text-align: left;
}
.res:hover {
  background: var(--surface-3);
}
.ava {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 700;
  font-size: var(--fs-13);
}
.rw {
  flex: 1;
  min-width: 0;
  display: grid;
}
.rn {
  font-weight: 600;
}
.rm {
  font-size: var(--fs-13);
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rs {
  font-size: var(--fs-13);
  color: var(--stamp);
}
.qr-mode {
  display: grid;
  gap: 14px;
}
.or {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink-3);
  font-size: var(--fs-13);
}
.or::before,
.or::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--line);
}
.manual {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.manual :deep(.field) {
  flex: 1;
}
.manual .btn {
  height: 46px;
}
.result {
  padding: 18px;
  min-height: 340px;
}
.placeholder {
  height: 100%;
  min-height: 300px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  text-align: center;
  color: var(--ink-3);
  max-width: 34ch;
  margin: 0 auto;
}
@media (max-width: 899px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .layout.has .finder {
    display: none;
  }
  .layout:not(.has) .result {
    display: none;
  }
}
</style>
