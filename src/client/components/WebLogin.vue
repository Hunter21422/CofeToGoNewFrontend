<script setup lang="ts">
import { botUsername } from '@/shared/utils/format'
import { ArrowLeft } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { clientApi } from '@/shared/api/client'
import { ApiError, isPersistent, setPersistent } from '@/shared/api/http'
import type { TelegramWidgetUser } from '@/shared/api/types'
import UiButton from '@/shared/components/UiButton.vue'
import { useInstall } from '../composables/useInstall'

const emit = defineEmits<{ done: [] }>()

const SHOP = import.meta.env.VITE_SHOP_NAME || 'Кофе с тобой'
const BOT = botUsername()
const installer = useInstall()
const canInstall = installer.available

const step = ref<'phone' | 'code' | 'name'>('phone')
const firstName = ref('')
const phone = ref('')
const code = ref('')
const busy = ref(false)
const err = ref<string | null>(null)
const remember = ref(isPersistent())
function setRemember(v: boolean) {
  remember.value = v
  try {
    localStorage.setItem('kofe.remember', v ? '1' : '0')
  } catch {
    /* приватный режим */
  }
  setPersistent(v)
}
const resendAt = ref(0)
const channel = ref<'call' | 'sms' | 'log'>('sms')
const now = ref(Date.now())
const codeEl = ref<HTMLInputElement | null>(null)
const tick = setInterval(() => (now.value = Date.now()), 500)
onBeforeUnmount(() => clearInterval(tick))

/** «9991234567» → «+7 999 123-45-67» */
function formatPhone(raw: string) {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('8') || d.startsWith('7')) d = d.slice(1)
  d = d.slice(0, 10)
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)]
  let out = '+7'
  if (p[0]) out += ' ' + p[0]
  if (p[1]) out += ' ' + p[1]
  if (p[2]) out += '-' + p[2]
  if (p[3]) out += '-' + p[3]
  return out
}
const digits = computed(() => phone.value.replace(/\D/g, '').replace(/^[78]/, ''))
const phoneOk = computed(() => digits.value.length === 10)
const e164 = computed(() => '+7' + digits.value)
const resendIn = computed(() => Math.max(0, Math.ceil((resendAt.value - now.value) / 1000)))

function onPhone(e: Event) {
  const el = e.target as HTMLInputElement
  phone.value = el.value.replace(/\D/g, '') ? formatPhone(el.value) : ''
  el.value = phone.value
  err.value = null
}

async function sendCode() {
  if (!phoneOk.value || busy.value) return
  busy.value = true
  err.value = null
  try {
    const r = await clientApi.smsSend(e164.value)
    resendAt.value = Date.now() + r.resend_in * 1000
    channel.value = r.channel ?? 'sms'
    step.value = 'code'
    code.value = ''
    await nextTick()
    codeEl.value?.focus()
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Не получилось отправить код'
  } finally {
    busy.value = false
  }
}

async function verify() {
  if (code.value.length !== 4 || busy.value) return
  busy.value = true
  err.value = null
  try {
    await clientApi.smsVerify(e164.value, code.value)
    const me = await clientApi.me()
    if (!me.first_name || me.first_name === 'Гость') step.value = 'name'
    else emit('done')
  } catch (e) {
    err.value = e instanceof ApiError ? e.message : 'Не получилось войти'
    code.value = ''
    codeEl.value?.focus()
  } finally {
    busy.value = false
  }
}
async function saveName() {
  const name = firstName.value.trim()
  if (!name) return emit('done')
  busy.value = true
  try {
    await clientApi.updateMe({ first_name: name })
  } catch {
    /* имя можно поменять потом в профиле */
  } finally {
    busy.value = false
    emit('done')
  }
}
function onCode(e: Event) {
  code.value = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4)
  err.value = null
  if (code.value.length === 4) verify()
}

// ---------- Telegram Login Widget ----------
const widgetEl = ref<HTMLDivElement | null>(null)
async function onTelegram(user: TelegramWidgetUser) {
  busy.value = true
  err.value = null
  try {
    await clientApi.authTelegramWidget(user)
    emit('done')
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Telegram не подтвердил вход'
  } finally {
    busy.value = false
  }
}
// В моке настоящий виджет не заработает (нужен домен, привязанный к боту в @BotFather) — имитируем ответ
onMounted(() => {
  if (!widgetEl.value) return
  ;(window as unknown as { onTelegramAuth: (u: TelegramWidgetUser) => void }).onTelegramAuth = onTelegram
  const s = document.createElement('script')
  s.src = 'https://telegram.org/js/telegram-widget.js?22'
  s.async = true
  s.setAttribute('data-telegram-login', BOT)
  s.setAttribute('data-size', 'large')
  s.setAttribute('data-radius', '14')
  s.setAttribute('data-request-access', 'write')
  s.setAttribute('data-onauth', 'onTelegramAuth(user)')
  widgetEl.value.appendChild(s)
})
</script>

<template>
  <main class="wl">
    <section class="box">
      <svg class="logo" viewBox="0 0 48 48" aria-hidden="true">
        <ellipse cx="24" cy="24" rx="12" ry="17" transform="rotate(-28 24 24)" fill="currentColor" />
        <path d="M19 10c7 6 0 18 9 26" stroke="var(--paper)" stroke-width="3" fill="none" stroke-linecap="round" />
      </svg>
      <h1 class="t">{{ SHOP }}</h1>

      <template v-if="step === 'phone'">
        <p class="sub">Войдите, чтобы заказывать заранее и копить штампы: штамп за каждый заказ, 6-й — напиток в подарок.</p>
        <form class="form" @submit.prevent="sendCode">
          <label class="lbl" for="wl-phone">Номер телефона</label>
          <input
            id="wl-phone"
            class="inp num"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            placeholder="+7 999 123-45-67"
            :value="phone"
            :aria-invalid="!!err || undefined"
            @input="onPhone"
          />
          <p v-if="err" class="err" role="alert">{{ err }}</p>
          <UiButton type="submit" size="lg" block :disabled="!phoneOk" :loading="busy">Получить код</UiButton>
        </form>

        <div class="or"><span>или</span></div>

        <div ref="widgetEl" class="tgw"></div>
        <label class="remember">
          <input type="checkbox" :checked="remember" @change="setRemember(($event.target as HTMLInputElement).checked)" />
          <span>Запомнить это устройство<small>Не придётся входить заново. Снимите галочку на чужом или общем компьютере — выйдем, когда закроете вкладку.</small></span>
        </label>
        <p class="fine">Входя, вы соглашаетесь с обработкой номера телефона для программы лояльности.</p>
        <button v-if="canInstall" type="button" class="resend" @click="installer.show()">Как установить на телефон</button>
      </template>

      <template v-else-if="step === 'name'">
        <p class="sub">Вы вошли! Как к вам обращаться? Имя увидит бариста, когда будет выдавать заказ.</p>
        <label class="lbl" for="wl-name">Имя</label>
        <input id="wl-name" v-model="firstName" class="inp" type="text" autocomplete="given-name" maxlength="64" placeholder="Анна" @keydown.enter="saveName" />
        <UiButton size="lg" block :loading="busy" @click="saveName">Продолжить</UiButton>
        <button type="button" class="resend" :disabled="busy" @click="emit('done')">Пропустить</button>
      </template>

      <template v-else-if="step === 'code'">
        <button type="button" class="back" @click="step = 'phone'"><ArrowLeft :size="16" /> {{ phone }}</button>
        <p v-if="channel === 'call'" class="sub">Сейчас вам позвонит робот — брать трубку не нужно. Введите <b>последние 4 цифры</b> номера, с которого пришёл звонок.</p>
        <p v-else class="sub">Мы отправили SMS с кодом из 4 цифр.</p>
        <label class="lbl" for="wl-code">{{ channel === 'call' ? 'Последние 4 цифры номера' : 'Код из SMS' }}</label>
        <input
          id="wl-code"
          ref="codeEl"
          class="inp code num"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="4"
          placeholder="••••"
          :value="code"
          :aria-invalid="!!err || undefined"
          @input="onCode"
        />
        <p v-if="err" class="err" role="alert">{{ err }}</p>
        <UiButton size="lg" block :disabled="code.length !== 4" :loading="busy" @click="verify">Войти</UiButton>
        <button type="button" class="resend" :disabled="resendIn > 0 || busy" @click="sendCode">
          {{ resendIn > 0 ? `${channel === 'call' ? 'Позвонить' : 'Отправить'} снова через ${resendIn} с` : channel === 'call' ? 'Позвонить ещё раз' : 'Отправить код ещё раз' }}
        </button>
      </template>
    </section>
  </main>
</template>

<style scoped>
.wl {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
}
.box {
  width: min(100%, 400px);
  display: grid;
  gap: 14px;
}
.logo {
  width: 52px;
  color: var(--primary);
}
.t {
  font-size: var(--fs-32);
  line-height: 1.05;
}
.sub {
  color: var(--ink-2);
}
.form {
  display: grid;
  gap: 10px;
}
.lbl {
  font-size: var(--fs-13);
  font-weight: 600;
  color: var(--ink-2);
}
.inp {
  width: 100%;
  min-height: 54px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1.5px solid transparent;
  background: var(--surface);
  color: var(--ink);
  font-size: var(--fs-20);
  outline: none;
}
.inp:focus {
  border-color: var(--primary);
}
.inp[aria-invalid] {
  border-color: var(--danger);
}
.inp.code {
  text-align: center;
  letter-spacing: 0.5em;
  font-size: var(--fs-32);
  font-weight: 700;
}
.err {
  color: var(--danger);
  font-size: var(--fs-13);
}
.or {
  display: flex;
  align-items: center;
  gap: 12px;
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
.tgw {
  display: grid;
  justify-items: center;
  min-height: 48px;
}
.remember {
  display: flex;
  gap: 10px;
  align-items: flex-start;
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
.fine {
  font-size: var(--fs-11);
  color: var(--ink-3);
  text-align: center;
}
.back {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-2);
  font-weight: 600;
}
.resend {
  color: var(--primary);
  font-weight: 600;
  font-size: var(--fs-13);
}
.resend:disabled {
  color: var(--ink-3);
}
</style>
