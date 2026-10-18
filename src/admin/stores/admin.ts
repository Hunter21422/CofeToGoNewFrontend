import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { adminApi } from '@/shared/api/admin'
import { clientApi } from '@/shared/api/client'
import { ApiError, hasTokens, onPinRequired, setInitDataProvider, setTokens } from '@/shared/api/http'
import type { AdminMe, StaffRole } from '@/shared/api/types'
import { tg } from '@/shared/telegram'

const RANK: Record<StaffRole, number> = { barista: 1, manager: 2, owner: 3 }
const LOC_KEY = 'kofe.admin.location'
const SOUND_KEY = 'kofe.admin.sound'

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, v: string) {
  try {
    localStorage.setItem(key, v)
  } catch {
    /* ignore */
  }
}

/**
 * Этапы входа:
 *  login   — нет сессии и мы не в Telegram: нужна ссылка из бота (/admin)
 *  pin-setup / pin — Telegram пройден, нужен второй фактор
 *  ready   — можно работать
 *  denied  — человек не в команде
 */
export type Stage = 'loading' | 'login' | 'pin-setup' | 'pin' | 'ready' | 'denied'

export const useAdmin = defineStore('admin', () => {
  const me = ref<AdminMe | null>(null)
  const stage = ref<Stage>('loading')
  const error = ref<string | null>(null)
  const locationId = ref<number | null>(Number(read(LOC_KEY)) || null)
  const sound = ref(read(SOUND_KEY) !== 'off')

  const ready = computed(() => stage.value === 'ready')
  const realRole = computed<StaffRole>(() => me.value?.staff.role ?? 'barista')
  const role = computed<StaffRole>(() => realRole.value)
  const can = (min: StaffRole) => RANK[role.value] >= RANK[min]
  const locations = computed(() => {
    const all = me.value?.locations ?? []
    const own = me.value?.staff.location_id
    return own && role.value !== 'owner' ? all.filter((l) => l.id === own) : all
  })
  const location = computed(() => locations.value.find((l) => l.id === locationId.value) ?? locations.value[0] ?? null)

  // любой 403 pin_required (истёк токен с PIN, сеанс заблокирован) → экран PIN
  onPinRequired(() => {
    if (stage.value === 'ready') stage.value = me.value?.pin_set === false ? 'pin-setup' : 'pin'
  })

  /** Ссылка из бота: /<VITE_ADMIN_PATH>/#/login?t=XXXX */
  function magicToken(): string | null {
    const m = location_hash().match(/[?&]t=([^&]+)/)
    return location_hash().startsWith('#/login') && m ? decodeURIComponent(m[1]) : null
  }
  const location_hash = () => window.location.hash

  async function boot() {
    error.value = null
    stage.value = 'loading'
    try {
      setInitDataProvider(() => tg.initData())
      const magic = magicToken()
      if (magic) {
        await adminApi.magicLogin(magic)
        history.replaceState(null, '', window.location.pathname + '#/')
      } else if (!hasTokens()) {
        // внутри Telegram вход автоматический; в браузере — только по ссылке из бота
        if (!tg.inTelegram) return void (stage.value = 'login')
        await clientApi.authTelegram(tg.initData())
      }
      await loadMe()
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.code === 'session_revoked')) {
        setTokens(null)
        error.value = e.message
        stage.value = 'login'
      } else if (e instanceof ApiError && e.status === 403) {
        error.value = e.message
        stage.value = 'denied'
      } else {
        error.value = e instanceof Error ? e.message : 'Нет связи'
        stage.value = 'denied'
      }
    }
  }

  async function loadMe() {
    me.value = await adminApi.me()
    if (!location.value || location.value.id !== locationId.value) setLocation(location.value?.id ?? null)
    stage.value = !me.value.pin_set ? 'pin-setup' : !me.value.pin_verified ? 'pin' : 'ready'
  }

  /** Второй фактор пройден */
  async function unlocked() {
    await loadMe()
    tg.haptic.success()
  }

  async function lock() {
    if (stage.value !== 'ready') return
    try {
      await adminApi.lock()
    } catch {
      /* даже без сети прячем панель */
    }
    stage.value = 'pin'
  }

  async function logout() {
    await adminApi.logout().catch(() => {})
    me.value = null
    error.value = null
    stage.value = tg.inTelegram ? 'loading' : 'login'
    if (tg.inTelegram) tg.raw?.close()
  }

  function setLocation(id: number | null) {
    locationId.value = id
    if (id) write(LOC_KEY, String(id))
  }
  function toggleSound() {
    sound.value = !sound.value
    write(SOUND_KEY, sound.value ? 'on' : 'off')
  }

  return {
    me, stage, ready, error, locationId, location, locations, sound, role, realRole, can,
    boot, loadMe, unlocked, lock, logout, setLocation, toggleSound,
  }
})
