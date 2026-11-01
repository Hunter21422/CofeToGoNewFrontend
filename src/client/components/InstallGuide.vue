<script setup lang="ts">
import { Bell, Check, Download, Ellipsis, EllipsisVertical, ExternalLink, Send, Share, SquarePlus, Stamp, Zap } from 'lucide-vue-next'
import { ref } from 'vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiSegmented from '@/shared/components/UiSegmented.vue'
import { botUsername } from '@/shared/utils/format'
import { useInstall } from '../composables/useInstall'

const SHOP = import.meta.env.VITE_SHOP_NAME || 'Кофе с тобой'
const host = location.host
const BOT = botUsername()
const { platform, canPrompt, install, skip } = useInstall()

const os = ref<'ios' | 'android'>(platform.value === 'ios' || platform.value === 'ios-other' || (platform.value === 'inapp' && /iphone|ipad|ipod/i.test(navigator.userAgent)) ? 'ios' : 'android')
const inApp = platform.value === 'inapp'
const iosOther = platform.value === 'ios-other'

const perks = [
  { icon: Zap, text: 'Иконка на экране — заказ в два касания' },
  { icon: Bell, text: 'Уведомления, когда заказ готов' },
  { icon: Stamp, text: 'Вход один раз, карта со штампами всегда под рукой' },
]
</script>

<template>
  <main class="ig">
    <section class="box">
      <svg class="logo" viewBox="0 0 48 48" aria-hidden="true">
        <ellipse cx="24" cy="24" rx="12" ry="17" transform="rotate(-28 24 24)" fill="currentColor" />
        <path d="M19 10c7 6 0 18 9 26" stroke="var(--paper)" stroke-width="3" fill="none" stroke-linecap="round" />
      </svg>
      <h1 class="t">Установите «{{ SHOP }}» на телефон</h1>
      <p class="sub">Это займёт 10 секунд. Магазин приложений не нужен.</p>

      <ul class="perks">
        <li v-for="p in perks" :key="p.text"><component :is="p.icon" :size="18" />{{ p.text }}</li>
      </ul>

      <div v-if="inApp" class="inapp">
        <p class="inapp-t"><ExternalLink :size="18" /> Сначала откройте сайт в браузере</p>
        <p class="inapp-d">Вы открыли ссылку внутри другого приложения. Нажмите <b><Ellipsis :size="15" class="ii" /></b> в углу экрана и выберите «Открыть в браузере». Дальше — шаги ниже.</p>
      </div>

      <UiSegmented
        v-model="os"
        class="os"
        :options="[
          { value: 'ios', label: 'iPhone' },
          { value: 'android', label: 'Android' },
        ]"
      />

      <ol v-if="os === 'ios'" class="steps">
        <li class="step">
          <div class="st"><span class="n num">1</span><span>Нажмите <b>«Поделиться»</b> {{ iosOther ? 'в адресной строке браузера' : 'внизу экрана Safari' }}</span></div>
          <div class="mock bar-bottom">
            <span class="url">{{ host }}</span>
            <div class="tools">
              <span class="ti">‹</span><span class="ti">›</span>
              <span class="ti hl"><Share :size="18" /></span>
              <span class="ti"><Ellipsis :size="18" /></span>
            </div>
          </div>
          <p class="note">Не видно кнопки — нажмите <b>«⋯»</b>, «Поделиться» будет там.</p>
        </li>
        <li class="step">
          <div class="st"><span class="n num">2</span><span>Пролистайте вниз и выберите <b>«На экран „Домой“»</b></span></div>
          <div class="mock sheet">
            <span class="row">Скопировать</span>
            <span class="row">Добавить в избранное</span>
            <span class="row hl">На экран «Домой» <SquarePlus :size="17" /></span>
          </div>
        </li>
        <li class="step">
          <div class="st"><span class="n num">3</span><span>Нажмите <b>«Добавить»</b> в правом верхнем углу</span></div>
          <div class="mock top">
            <span class="cancel">Отменить</span>
            <span class="ttl">На экран «Домой»</span>
            <span class="add hl">Добавить</span>
          </div>
          <p class="note">Иконка «{{ SHOP }}» появится на экране — открывайте приложение с неё.</p>
        </li>
      </ol>

      <template v-else>
        <UiButton v-if="canPrompt" size="lg" block @click="install"><Download :size="20" />Установить приложение</UiButton>
        <p v-if="canPrompt" class="or">или вручную:</p>
        <ol class="steps">
          <li class="step">
            <div class="st"><span class="n num">1</span><span>Нажмите <b>⋮</b> в правом верхнем углу браузера</span></div>
            <div class="mock bar-top">
              <span class="url">{{ host }}</span>
              <span class="ti hl"><EllipsisVertical :size="18" /></span>
            </div>
          </li>
          <li class="step">
            <div class="st"><span class="n num">2</span><span>Выберите <b>«Установить приложение»</b> или <b>«Добавить на главный экран»</b></span></div>
            <div class="mock sheet">
              <span class="row">Новая вкладка</span>
              <span class="row">История</span>
              <span class="row hl"><Download :size="17" /> Установить приложение</span>
            </div>
          </li>
          <li class="step">
            <div class="st"><span class="n num">3</span><span>Подтвердите — нажмите <b>«Установить»</b></span></div>
            <div class="mock dialog">
              <span class="ttl">Установить приложение?</span>
              <span class="btns"><span class="cancel">Отмена</span><span class="add hl">Установить</span></span>
            </div>
            <p class="note">В Яндекс Браузере: меню <b>⋮</b> → <b>«Добавить ярлык»</b> или <b>«На главный экран»</b>.</p>
          </li>
        </ol>
      </template>

      <a class="tg" :href="`https://t.me/${BOT}`" target="_blank" rel="noopener">
        <Send :size="18" />
        <span>Есть Telegram? Заказывайте прямо в боте <b>@{{ BOT }}</b></span>
      </a>

      <button type="button" class="skip" @click="skip"><Check :size="16" /> Продолжить в браузере</button>
    </section>
  </main>
</template>

<style scoped>
.ig {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px 16px calc(24px + env(safe-area-inset-bottom));
}
.box {
  width: min(100%, 420px);
  display: grid;
  gap: 16px;
}
.logo {
  width: 52px;
  color: var(--primary);
}
.t {
  font-size: var(--fs-24);
  line-height: 1.15;
  white-space: normal;
  text-wrap: balance;
}
.sub {
  color: var(--ink-2);
}
.perks {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: var(--r-card);
  background: var(--primary-soft);
  margin: 0;
  list-style: none;
}
.perks li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--fs-15);
  font-weight: 500;
  color: var(--ink);
}
.perks li :deep(svg) {
  flex: none;
  color: var(--primary);
}
.inapp {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: var(--r-tile);
  background: var(--crema-soft, #f6ead6);
}
.inapp-t {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}
.inapp-d {
  font-size: var(--fs-13);
  color: var(--ink-2);
  line-height: 1.4;
}
.ii {
  vertical-align: -3px;
}
.os {
  width: 100%;
}
.or {
  text-align: center;
  font-size: var(--fs-13);
  color: var(--ink-3);
}
.steps {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.step {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: var(--r-tile);
  background: var(--surface);
}
.st {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 10px;
  align-items: start;
  font-size: var(--fs-15);
  line-height: 1.35;
}
.n {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  font-size: var(--fs-13);
}
.note {
  font-size: var(--fs-13);
  color: var(--ink-2);
  line-height: 1.4;
}
.mock {
  border-radius: 14px;
  background: #f4f4f6;
  border: 1px solid #e3e3e8;
  color: #1c1c1e;
  font-size: 13px;
  overflow: hidden;
}
.hl {
  position: relative;
  color: #0a84ff !important;
  font-weight: 700;
  box-shadow: 0 0 0 2px #0a84ff;
  border-radius: 8px;
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse {
  50% {
    box-shadow: 0 0 0 5px rgba(10, 132, 255, 0.25);
  }
}
.bar-bottom {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
}
.url {
  justify-self: center;
  padding: 6px 14px;
  border-radius: 10px;
  background: #fff;
  color: #3a3a3c;
  font-size: 12px;
}
.tools {
  display: flex;
  justify-content: space-around;
  align-items: center;
}
.ti {
  min-width: 32px;
  height: 30px;
  display: grid;
  place-items: center;
  font-size: 20px;
  color: #8e8e93;
}
.sheet {
  display: grid;
  background: #fff;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 11px 14px;
  border-bottom: 1px solid #ececf0;
}
.row:last-child {
  border-bottom: 0;
}
.sheet .row.hl {
  margin: 4px;
  justify-content: flex-start;
}
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 12px;
  background: #fff;
}
.cancel {
  color: #0a84ff;
}
.ttl {
  font-weight: 600;
}
.add {
  padding: 4px 8px;
}
.bar-top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}
.bar-top .url {
  flex: 1;
  justify-self: stretch;
  text-align: left;
}
.dialog {
  display: grid;
  gap: 14px;
  padding: 16px;
  background: #fff;
}
.btns {
  display: flex;
  justify-content: flex-end;
  gap: 18px;
  align-items: center;
}
.tg {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--r-tile);
  border: 1px solid var(--line);
  color: var(--ink-2);
  font-size: var(--fs-13);
  text-decoration: none;
}
.tg :deep(svg) {
  flex: none;
  color: #2aabee;
}
.tg b {
  color: var(--ink);
}
.skip {
  justify-self: center;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: 0;
  background: none;
  color: var(--ink-2);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
</style>
