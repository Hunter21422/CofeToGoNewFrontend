import { computed, ref } from 'vue'
import { tg } from '@/shared/telegram'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const KEY = 'kofe.install'
const ua = navigator.userAgent
const isIos = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
const isAndroid = /android/i.test(ua)
const inApp = /Instagram|FBAN|FBAV|VKClient|vk_app|Line\/|OKApp|MicroMessenger/i.test(ua)
const iosOther = isIos && /CriOS|FxiOS|EdgiOS|YaBrowser|OPiOS/i.test(ua)

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
}

function read() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

const deferred = ref<InstallPromptEvent | null>(null)
const installed = ref(isStandalone())
const open = ref(!tg.inTelegram && !installed.value && (isIos || isAndroid) && read() !== 'skip')

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred.value = e as InstallPromptEvent
})
window.addEventListener('appinstalled', () => {
  installed.value = true
  deferred.value = null
  open.value = false
})

export function useInstall() {
  const platform = computed<'inapp' | 'ios' | 'ios-other' | 'android' | 'desktop'>(() => {
    if (inApp) return 'inapp'
    if (isIos) return iosOther ? 'ios-other' : 'ios'
    if (isAndroid) return 'android'
    return 'desktop'
  })
  const canPrompt = computed(() => !!deferred.value)
  const available = computed(() => !tg.inTelegram && !installed.value)

  async function install() {
    const ev = deferred.value
    if (!ev) return false
    await ev.prompt()
    const { outcome } = await ev.userChoice
    deferred.value = null
    if (outcome === 'accepted') open.value = false
    return outcome === 'accepted'
  }

  function skip() {
    try {
      localStorage.setItem(KEY, 'skip')
    } catch {
      /* приватный режим */
    }
    open.value = false
  }

  function show() {
    open.value = true
  }

  return { open, platform, canPrompt, available, install, skip, show }
}
