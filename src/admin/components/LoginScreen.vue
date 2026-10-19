<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { adminApi } from '@/shared/api/admin'
import { clientApi } from '@/shared/api/client'
import { ApiError } from '@/shared/api/http'
import UiButton from '@/shared/components/UiButton.vue'
import { useAdmin } from '../stores/admin'

const admin = useAdmin()
const BOT = import.meta.env.VITE_BOT_USERNAME || 'kofe_s_toboy_bot'

const mode = ref<'tg' | 'phone' | 'code'>('tg')
const phone = ref('')
const code = ref('')
const channel = ref<'call' | 'sms' | 'log'>('call')
const busy = ref(false)
const err = ref<string | null>(null)
const codeEl = ref<HTMLInputElement | null>(null)
const digits = computed(() => {
  let d = phone.value.replace(/\D/g, '')
  if (d.startsWith('8') || d.startsWith('7')) d = d.slice(1)
  return d.slice(0, 10)
})

async function send() {
  if (digits.value.length !== 10 || busy.value) return
  busy.value = true
  err.value = null
  try {
    const r = await adminApi.staffPhoneSend(`+7${digits.value}`)
    channel.value = r.channel ?? 'sms'
    mode.value = 'code'
    code.value = ''
    await nextTick()
    codeEl.value?.focus()
  } catch (e) {
    err.value = e instanceof ApiError ? e.message : 'Не получилось'
  } finally {
    busy.value = false
  }
}
async function verify() {
  if (code.value.length !== 4 || busy.value) return
  busy.value = true
  err.value = null
  try {
    await clientApi.smsVerify(`+7${digits.value}`, code.value)
    await admin.loadMe()
  } catch (e) {
    err.value = e instanceof ApiError ? e.message : 'Не получилось войти'
    code.value = ''
  } finally {
    busy.value = false
  }
}
function onCode(e: Event) {
  code.value = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4)
  if (code.value.length === 4) verify()
}
</script>

<template>
  <main class="login">
    <section class="box">
      <img src="/favicon.svg" alt="" width="56" height="56" />
      <h1 class="t">Панель кофейни</h1>
      <p v-if="admin.error" class="err">{{ admin.error }}</p>
      <p class="muted">Вход только для команды. Добавить сотрудника может владелец в разделе «Команда».</p>

      <ol class="steps">
        <li><span class="n num">1</span><span>Откройте бота <a :href="`https://t.me/${BOT}`" target="_blank" rel="noopener">@{{ BOT }}</a> в Telegram</span></li>
        <li><span class="n num">2</span><span>Отправьте команду <code>/admin</code></span></li>
        <li><span class="n num">3</span><span>Откройте ссылку на этом устройстве — она одноразовая и живёт 2 минуты</span></li>
        <li><span class="n num">4</span><span>Введите свой PIN</span></li>
      </ol>

      <p class="faint small">С телефона проще: откройте бота и нажмите кнопку «Панель бариста» — войдёте сразу на шаг с PIN.</p>

      <div class="alt">
        <button v-if="mode === 'tg'" type="button" class="link" @click="mode = 'phone'">Telegram не работает? Войти по номеру телефона</button>
        <form v-else-if="mode === 'phone'" class="altf" @submit.prevent="send">
          <label class="lbl" for="ap">Номер, привязанный к вашему профилю</label>
          <input id="ap" v-model="phone" class="inp" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 999 123-45-67" />
          <p v-if="err" class="err">{{ err }}</p>
          <UiButton type="submit" block :loading="busy" :disabled="digits.length !== 10">Получить код</UiButton>
          <button type="button" class="link" @click="(mode = 'tg'), (err = null)">Назад</button>
        </form>
        <div v-else class="altf">
          <p class="muted small">
            {{ channel === 'call' ? 'Сейчас позвонит робот — брать трубку не нужно. Введите последние 4 цифры номера, с которого звонят.' : 'Введите код из SMS.' }}
          </p>
          <input ref="codeEl" class="inp num" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="4" placeholder="••••" :value="code" @input="onCode" />
          <p v-if="err" class="err">{{ err }}</p>
          <UiButton block :loading="busy" :disabled="code.length !== 4" @click="verify">Войти</UiButton>
          <button type="button" class="link" @click="(mode = 'phone'), (err = null)">Другой номер</button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
}
.box {
  width: min(100%, 420px);
  display: grid;
  gap: 14px;
  padding: 28px 24px;
  border-radius: var(--r-sheet);
  background: var(--surface);
}
.t {
  font-size: var(--fs-24);
}
.err {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--danger-soft);
  color: var(--danger);
  font-weight: 600;
  font-size: var(--fs-13);
}
.steps {
  list-style: none;
  margin: 4px 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.steps li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.n {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: var(--fs-13);
}
.steps a {
  color: var(--primary);
  font-weight: 600;
}
code {
  font-family: var(--font-display);
  font-size: var(--fs-13);
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--surface-2);
}
.small {
  font-size: var(--fs-13);
}
.alt {
  border-top: 1px solid var(--surface-2);
  padding-top: 14px;
}
.altf {
  display: grid;
  gap: 10px;
}
.link {
  width: 100%;
  color: var(--primary);
  font-weight: 600;
  font-size: var(--fs-13);
  text-align: center;
  padding: 6px 0;
}
.lbl {
  font-size: var(--fs-13);
  font-weight: 600;
}
.inp {
  height: 48px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid transparent;
  background: var(--surface-2);
  color: var(--ink);
  font-size: var(--fs-17);
}
.inp:focus {
  outline: none;
  border-color: var(--primary);
}
</style>
