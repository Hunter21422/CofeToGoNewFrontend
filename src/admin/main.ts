import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/shared/styles/base.css'
import './admin.css'
import { configureTokens } from '@/shared/api/http'
import { tg } from '@/shared/telegram'
import App from './App.vue'
import { router } from './router'
import { useAdmin } from './stores/admin'

tg.init()
let remember = false
try {
  remember = localStorage.getItem('kofe.admin.remember') === '1'
} catch {
  /* приватный режим */
}
configureTokens('kofe.admin.tokens', remember)

const app = createApp(App).use(createPinia()).use(router)

// Роль проверяем на каждом переходе: бариста не откроет аналитику по прямой ссылке
router.beforeEach(async (to) => {
  const admin = useAdmin()
  if (admin.stage === 'loading') await admin.boot()
  if (!admin.ready) return true
  if (to.meta.role && !admin.can(to.meta.role)) return { path: '/' }
  return true
})

app.mount('#app')
