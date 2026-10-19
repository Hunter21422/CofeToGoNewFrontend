import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/shared/styles/base.css'
import './client.css'
import { configureTokens } from '@/shared/api/http'
import { tg } from '@/shared/telegram'
import App from './App.vue'
import { router } from './router'

tg.init()
configureTokens('kofe.tokens', true)

createApp(App).use(createPinia()).use(router).mount('#app')

// Вне Telegram сайт можно установить на телефон как приложение (PWA)
if (!tg.inTelegram && import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
