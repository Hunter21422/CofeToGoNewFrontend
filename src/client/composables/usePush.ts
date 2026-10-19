import { computed, ref } from 'vue'
import { clientApi } from '@/shared/api/client'
import { tg } from '@/shared/telegram'

const enabled = ref(false)
const busy = ref(false)
const checked = ref(false)

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

function toKey(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export const PUSH_DENIED_HELP = 'Уведомления для сайта заблокированы. Нажмите на замок слева от адреса сайта → «Уведомления» → «Разрешить» и попробуйте снова.'
export const PUSH_DISMISSED_HELP = 'Вы закрыли запрос. Нажмите ещё раз и выберите «Разрешить».'

export function usePush() {
  const supported = !tg.inTelegram && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const needsInstall = !tg.inTelegram && isIos && !standalone
  const denied = computed(() => supported && Notification.permission === 'denied')

  async function check() {
    if (!supported || checked.value) return
    checked.value = true
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      enabled.value = !!sub && Notification.permission === 'granted'
    } catch {
      enabled.value = false
    }
  }

  async function enable(): Promise<'ok' | 'denied' | 'dismissed'> {
    if (!supported) return 'denied'
    busy.value = true
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'dismissed'
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
      await navigator.serviceWorker.ready
      const { public_key } = await clientApi.pushKey()
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(public_key) }))
      await clientApi.pushSubscribe(sub.toJSON())
      enabled.value = true
      return 'ok'
    } finally {
      busy.value = false
    }
  }

  async function disable() {
    busy.value = true
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await clientApi.pushUnsubscribe(sub.endpoint).catch(() => {})
        await sub.unsubscribe()
      }
      enabled.value = false
    } finally {
      busy.value = false
    }
  }

  return { supported, needsInstall, denied, enabled, busy, check, enable, disable }
}
