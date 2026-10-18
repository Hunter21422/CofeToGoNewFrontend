/**
 * Тонкая обёртка над Telegram.WebApp. Вне Telegram всё деградирует в браузерные аналоги,
 * поэтому приложение можно открыть просто по ссылке.
 */

interface TgButton {
  text: string
  isVisible: boolean
  isActive: boolean
  setText(t: string): void
  show(): void
  hide(): void
  enable(): void
  disable(): void
  showProgress(leaveActive?: boolean): void
  hideProgress(): void
  onClick(cb: () => void): void
  offClick(cb: () => void): void
  setParams(p: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }): void
}

interface TgWebApp {
  initData: string
  initDataUnsafe: { user?: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: Record<string, string>
  isExpanded: boolean
  ready(): void
  expand(): void
  close(): void
  setHeaderColor(c: string): void
  setBackgroundColor(c: string): void
  setBottomBarColor?(c: string): void
  enableClosingConfirmation(): void
  disableClosingConfirmation(): void
  disableVerticalSwipes?(): void
  onEvent(e: string, cb: (...a: unknown[]) => void): void
  offEvent(e: string, cb: (...a: unknown[]) => void): void
  MainButton: TgButton
  SecondaryButton?: TgButton
  BackButton: { isVisible: boolean; show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void }
  HapticFeedback: {
    impactOccurred(s: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
    notificationOccurred(t: 'error' | 'success' | 'warning'): void
    selectionChanged(): void
  }
  showScanQrPopup?(p: { text?: string }, cb: (text: string) => boolean | void): void
  closeScanQrPopup?(): void
  requestContact?(cb: (ok: boolean, res?: { responseUnsafe?: { contact?: { phone_number?: string } } }) => void): void
  showConfirm(msg: string, cb: (ok: boolean) => void): void
  showAlert(msg: string, cb?: () => void): void
  openLink(url: string): void
  openTelegramLink(url: string): void
  isVersionAtLeast(v: string): boolean
}

declare global {
  interface Window {
    Telegram?: { WebApp: TgWebApp }
  }
}

const wa: TgWebApp | null = typeof window !== 'undefined' && window.Telegram?.WebApp?.initData ? window.Telegram.WebApp : null

export const tg = {
  raw: wa,
  inTelegram: !!wa,
  initData(): string {
    if (wa) return wa.initData
    // вне Telegram: dev-режим, бэкенд при DEV_MODE примет такую строку
    const u = new URLSearchParams(location.search).get('dev') ?? '1'
    return `dev=${u}`
  },
  user: wa?.initDataUnsafe.user ?? null,
  colorScheme(): 'light' | 'dark' {
    if (wa) return wa.colorScheme
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  },

  init(opts: { fullscreen?: boolean } = {}) {
    applyTheme()
    if (wa) {
      wa.ready()
      wa.expand()
      wa.disableVerticalSwipes?.()
      wa.onEvent('themeChanged', applyTheme)
      void opts
    } else {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)
    }
  },

  haptic: {
    tap: () => wa?.HapticFeedback.impactOccurred('light'),
    soft: () => wa?.HapticFeedback.impactOccurred('soft'),
    heavy: () => wa?.HapticFeedback.impactOccurred('medium'),
    select: () => wa?.HapticFeedback.selectionChanged(),
    success: () => wa?.HapticFeedback.notificationOccurred('success'),
    error: () => wa?.HapticFeedback.notificationOccurred('error'),
    warning: () => wa?.HapticFeedback.notificationOccurred('warning'),
  },

  backButton(cb: (() => void) | null) {
    if (!wa) return () => {}
    if (!cb) {
      wa.BackButton.hide()
      return () => {}
    }
    wa.BackButton.show()
    wa.BackButton.onClick(cb)
    return () => {
      wa.BackButton.offClick(cb)
      wa.BackButton.hide()
    }
  },

  confirm(message: string): Promise<boolean> {
    if (wa) return new Promise((r) => wa.showConfirm(message, r))
    return Promise.resolve(window.confirm(message))
  },

  scanQr(text: string): Promise<string | null> {
    if (wa?.showScanQrPopup) {
      return new Promise((resolve) => {
        wa.showScanQrPopup!({ text }, (value) => {
          resolve(value)
          return true
        })
        wa.onEvent('scanQrPopupClosed', () => resolve(null))
      })
    }
    return Promise.resolve(null)
  },

  requestPhone(): Promise<string | null> {
    if (wa?.requestContact && wa.isVersionAtLeast('6.9')) {
      return new Promise((resolve) =>
        wa.requestContact!((ok, res) => resolve(ok ? (res?.responseUnsafe?.contact?.phone_number ?? null) : null)),
      )
    }
    return Promise.resolve(null)
  },

  openLink(url: string) {
    if (wa) wa.openLink(url)
    else window.open(url, '_blank', 'noopener')
  },
}

function applyTheme() {
  const scheme = tg.colorScheme()
  document.documentElement.dataset.theme = scheme
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || (scheme === 'dark' ? '#0e1411' : '#f2f4ef')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
  if (wa) {
    try {
      wa.setHeaderColor(bg)
      wa.setBackgroundColor(bg)
      wa.setBottomBarColor?.(bg)
    } catch {
      /* старые клиенты */
    }
  }
}
