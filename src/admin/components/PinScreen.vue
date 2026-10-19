<script setup lang="ts">
import { Delete, LockKeyhole } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { adminApi } from '@/shared/api/admin'
import { ApiError } from '@/shared/api/http'
import { useNow } from '@/shared/composables/usePolling'
import { tg } from '@/shared/telegram'
import { initials, plural, ROLE_LABEL, time } from '@/shared/utils/format'
import { useAdmin } from '../stores/admin'

const props = defineProps<{ mode: 'setup' | 'verify' }>()
const admin = useAdmin()
const now = useNow(1000)

const pin = ref('')
const first = ref<string | null>(null) // при задании: первый ввод
const error = ref<string | null>(null)
const busy = ref(false)
const shake = ref(false)
const lockedUntil = ref<string | null>(admin.me?.staff.pin_locked_until ?? null)

const locked = computed(() => !!lockedUntil.value && new Date(lockedUntil.value).getTime() > now.value)
const title = computed(() => {
  if (props.mode === 'verify') return 'Введите PIN'
  return first.value ? 'Повторите PIN' : 'Придумайте PIN'
})
const hint = computed(() => {
  if (locked.value) return `Слишком много неверных попыток. Попробуйте после ${time(lockedUntil.value)} — владелец получил уведомление.`
  if (props.mode === 'setup' && !first.value) return 'Личный код из 6 цифр. Его будете знать только вы — даже владелец не увидит. Не используйте 123456 и дату рождения.'
  if (props.mode === 'setup') return 'Ещё раз, чтобы не ошибиться'
  return 'Второй шаг входа в панель. Панель сама заблокируется, если 15 минут ничего не делать.'
})

function fail(msg: string) {
  error.value = msg
  shake.value = true
  tg.haptic.error()
  setTimeout(() => (shake.value = false), 400)
  pin.value = ''
}

async function submit() {
  if (pin.value.length !== 6 || busy.value || locked.value) return
  error.value = null
  if (props.mode === 'setup' && !first.value) {
    first.value = pin.value
    pin.value = ''
    return
  }
  busy.value = true
  try {
    const r = props.mode === 'setup' ? await adminApi.pinSetup(first.value!, pin.value) : await adminApi.pinVerify(pin.value)
    if (r.ok) return await admin.unlocked()
    if (r.locked_until) {
      lockedUntil.value = r.locked_until
      fail('Панель заблокирована на 15 минут')
    } else {
      const n = r.attempts_left ?? 0
      fail(`Неверный PIN. ${n === 1 ? 'Осталась 1 попытка' : `Осталось ${n} ${plural(n, 'попытка', 'попытки', 'попыток')}`}`)
    }
  } catch (e) {
    first.value = null
    fail(e instanceof ApiError ? e.message : 'Не получилось — попробуйте ещё раз')
  } finally {
    busy.value = false
  }
}
watch(pin, (v) => v.length === 6 && submit())

function press(d: string) {
  if (locked.value || busy.value) return
  error.value = null
  if (pin.value.length < 6) pin.value += d
  tg.haptic.select()
}
function back() {
  pin.value = pin.value.slice(0, -1)
}
function restart() {
  first.value = null
  pin.value = ''
  error.value = null
}
function onKey(e: KeyboardEvent) {
  if (/^\d$/.test(e.key)) press(e.key)
  else if (e.key === 'Backspace') back()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main class="lock">
    <section class="box" :class="{ shake }" aria-live="polite">
      <div class="who">
        <span class="ava">{{ initials(admin.me?.user.first_name ?? '', admin.me?.user.last_name) }}</span>
        <span>
          <span class="nm">{{ admin.me?.user.first_name }} {{ admin.me?.user.last_name }}</span>
          <span class="rl">{{ ROLE_LABEL[admin.realRole] }}</span>
        </span>
      </div>

      <LockKeyhole :size="26" class="ico" />
      <h1 class="t">{{ title }}</h1>
      <p class="h">{{ hint }}</p>

      <div class="dots" :aria-label="`Введено ${pin.length} из 6`">
        <span v-for="i in 6" :key="i" class="dot" :class="{ on: i <= pin.length, busy }" />
      </div>
      <p class="err">{{ error }}</p>

      <div class="pad" :class="{ off: locked }">
        <button v-for="d in ['1', '2', '3', '4', '5', '6', '7', '8', '9']" :key="d" class="key num" :disabled="locked" @click="press(d)">{{ d }}</button>
        <button v-if="mode === 'setup' && first" class="key fn" @click="restart">Заново</button>
        <span v-else />
        <button class="key num" :disabled="locked" @click="press('0')">0</button>
        <button class="key fn" aria-label="Стереть" @click="back"><Delete :size="22" /></button>
      </div>

      <label v-if="!tg.inTelegram" class="remember">
        <input type="checkbox" :checked="admin.remember" @change="admin.setRemember(($event.target as HTMLInputElement).checked)" />
        <span>Запомнить это устройство<small>Не придётся заново входить через Telegram — только PIN. Не включайте на общем компьютере.</small></span>
      </label>

      <button class="out" @click="admin.logout()">Это не я — выйти</button>
    </section>
  </main>
</template>

<style scoped>
.remember {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  text-align: left;
  max-width: 320px;
  font-size: var(--fs-13);
  font-weight: 600;
  cursor: pointer;
}
.remember input {
  margin-top: 2px;
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
  flex: none;
}
.remember small {
  display: block;
  font-weight: 400;
  color: var(--ink-3);
  margin-top: 2px;
}
.lock {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  background:
    radial-gradient(circle at 20% 10%, var(--primary-soft) 0, transparent 40%),
    var(--paper);
}
.box {
  width: min(100%, 380px);
  display: grid;
  justify-items: center;
  gap: 10px;
  text-align: center;
}
.box.shake {
  animation: shake 0.35s;
}
@keyframes shake {
  25% {
    transform: translateX(-8px);
  }
  50% {
    transform: translateX(8px);
  }
  75% {
    transform: translateX(-4px);
  }
}
.who {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  border-radius: var(--r-pill);
  background: var(--surface);
  text-align: left;
  margin-bottom: 18px;
}
.who > span:last-child {
  display: grid;
}
.ava {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 700;
  font-size: var(--fs-13);
}
.nm {
  font-weight: 600;
  font-size: var(--fs-13);
}
.rl {
  font-size: var(--fs-11);
  color: var(--ink-3);
}
.ico {
  color: var(--primary);
}
.t {
  font-size: var(--fs-24);
}
.h {
  color: var(--ink-2);
  font-size: var(--fs-13);
  max-width: 34ch;
  min-height: 3em;
}
.dots {
  display: flex;
  gap: 14px;
  margin: 10px 0 2px;
}
.dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--ink-3);
  transition:
    background-color 0.12s,
    transform 0.12s;
}
.dot.on {
  background: var(--ink);
  border-color: var(--ink);
  transform: scale(1.08);
}
.dot.busy {
  animation: pulse 0.8s infinite;
}
@keyframes pulse {
  50% {
    opacity: 0.4;
  }
}
.err {
  min-height: 1.4em;
  color: var(--danger);
  font-weight: 600;
  font-size: var(--fs-13);
}
.pad {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 4px;
}
.pad.off {
  opacity: 0.4;
}
.key {
  height: 64px;
  border-radius: 18px;
  background: var(--surface);
  font-size: var(--fs-24);
  font-weight: 600;
  display: grid;
  place-items: center;
  box-shadow: var(--shadow-lift);
  transition:
    transform 0.08s,
    background-color 0.1s;
}
.key:active:not(:disabled) {
  transform: scale(0.95);
  background: var(--surface-2);
}
.key.fn {
  font-family: var(--font-body);
  font-size: var(--fs-15);
  font-weight: 600;
  color: var(--ink-2);
  background: transparent;
  box-shadow: none;
}
.out {
  margin-top: 14px;
  color: var(--ink-3);
  font-size: var(--fs-13);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
