<script setup lang="ts">
import { Bell, Check, Download, Ellipsis, EllipsisVertical, ExternalLink, Send, Share, SquarePlus, Stamp, Zap } from 'lucide-vue-next'
import { computed, type Component } from 'vue'
import UiButton from '@/shared/components/UiButton.vue'
import { botUsername } from '@/shared/utils/format'
import { useInstall } from '../composables/useInstall'

const SHOP = import.meta.env.VITE_SHOP_NAME || 'Кофе с тобой'
const BOT = botUsername()
const { platform, canPrompt, install, skip } = useInstall()

interface Step {
  icon: Component
  text: string
}

const steps = computed<Step[]>(() => {
  switch (platform.value) {
    case 'ios':
      return [
        { icon: Share, text: 'Нажмите «Поделиться» — квадрат со стрелкой внизу экрана. Если его не видно, сначала нажмите «⋯»' },
        { icon: SquarePlus, text: 'Пролистайте вниз и выберите «На экран „Домой“»' },
        { icon: Check, text: 'Нажмите «Добавить» и откройте приложение с новой иконки' },
      ]
    case 'ios-other':
      return [
        { icon: Share, text: 'Нажмите «Поделиться» в адресной строке браузера' },
        { icon: SquarePlus, text: 'Выберите «На экран „Домой“»' },
        { icon: Check, text: 'Нажмите «Добавить» и откройте приложение с новой иконки' },
      ]
    case 'inapp':
      return [
        { icon: Ellipsis, text: 'Вы открыли ссылку внутри другого приложения. Нажмите «⋯» в углу экрана' },
        { icon: ExternalLink, text: 'Выберите «Открыть в браузере» — Safari или Chrome' },
        { icon: SquarePlus, text: 'Там добавьте сайт на экран «Домой»' },
      ]
    default:
      return [
        { icon: EllipsisVertical, text: 'Откройте меню браузера «⋮» в правом верхнем углу' },
        { icon: Download, text: 'Выберите «Установить приложение» или «Добавить на главный экран»' },
        { icon: Check, text: 'Подтвердите — иконка появится рядом с остальными приложениями' },
      ]
  }
})

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

      <template v-if="canPrompt">
        <UiButton size="lg" block @click="install"><Download :size="20" />Установить приложение</UiButton>
      </template>
      <ol v-else class="steps">
        <li v-for="(s, i) in steps" :key="i">
          <span class="n num">{{ i + 1 }}</span>
          <span class="ic"><component :is="s.icon" :size="20" /></span>
          <span class="tx">{{ s.text }}</span>
        </li>
      </ol>

      <a class="tg" :href="`https://t.me/${BOT}`" target="_blank" rel="noopener">
        <Send :size="18" />
        <span>Есть Telegram? Заказывайте прямо в боте <b>@{{ BOT }}</b></span>
      </a>

      <button type="button" class="skip" @click="skip">Продолжить в браузере</button>
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
.steps {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.steps li {
  display: grid;
  grid-template-columns: 24px 40px 1fr;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--r-tile);
  background: var(--surface);
}
.n {
  font-weight: 700;
  color: var(--ink-3);
}
.ic {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--primary);
}
.tx {
  font-size: var(--fs-15);
  line-height: 1.35;
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
  padding: 10px 16px;
  border: 0;
  background: none;
  color: var(--ink-2);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
</style>
