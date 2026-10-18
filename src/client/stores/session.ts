import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { clientApi } from '@/shared/api/client'
import { ApiError, hasTokens, setInitDataProvider } from '@/shared/api/http'
import type { LocationRead, LoyaltyRead, OrderShort, UserRead, UserUpdate } from '@/shared/api/types'
import { tg } from '@/shared/telegram'

const LOC_KEY = 'kofe.location'

export const useSession = defineStore('session', () => {
  const user = ref<UserRead | null>(null)
  const loyalty = ref<LoyaltyRead | null>(null)
  const activeOrders = ref<OrderShort[]>([])
  const locations = ref<LocationRead[]>([])
  const locationId = ref<number | null>(readLoc())
  const ready = ref(false)
  /** вне Telegram и без сессии — показываем экран входа */
  const needLogin = ref(false)
  const error = ref<string | null>(null)

  const location = computed(() => locations.value.find((l) => l.id === locationId.value) ?? locations.value[0] ?? null)

  function readLoc() {
    try {
      const v = localStorage.getItem(LOC_KEY)
      return v ? Number(v) : null
    } catch {
      return null
    }
  }

  async function boot() {
    error.value = null
    try {
      needLogin.value = false
      if (tg.inTelegram) {
        // в Telegram вход незаметный: по initData
        setInitDataProvider(() => tg.initData())
        if (!hasTokens()) await clientApi.authTelegram(tg.initData())
      } else if (!hasTokens()) {
        needLogin.value = true
        return
      }
      const [profile, locs] = await Promise.all([clientApi.profile(), clientApi.locations()])
      user.value = profile.user
      loyalty.value = profile.loyalty
      activeOrders.value = profile.active_orders
      locations.value = locs
      if (!locationId.value || !locs.some((l) => l.id === locationId.value)) {
        setLocation(profile.user.favorite_location_id ?? locs[0]?.id ?? null)
      }
      ready.value = true
    } catch (e) {
      // сессия на сайте протухла и refresh не помог — просто просим войти заново
      if (!tg.inTelegram && e instanceof ApiError && e.status === 401) {
        needLogin.value = true
        return
      }
      error.value = e instanceof Error ? e.message : 'Не удалось загрузиться'
    }
  }

  async function logout() {
    await clientApi.logout()
    user.value = null
    loyalty.value = null
    activeOrders.value = []
    ready.value = false
    needLogin.value = true
  }

  function setLocation(id: number | null) {
    locationId.value = id
    try {
      if (id) localStorage.setItem(LOC_KEY, String(id))
    } catch {
      /* ignore */
    }
  }

  async function refreshProfile() {
    const p = await clientApi.profile()
    user.value = p.user
    loyalty.value = p.loyalty
    activeOrders.value = p.active_orders
  }

  async function refreshLoyalty() {
    loyalty.value = await clientApi.loyalty()
  }

  async function update(data: UserUpdate) {
    user.value = await clientApi.updateMe(data)
  }

  async function setPhone(phone: string) {
    user.value = await clientApi.setPhone(phone)
  }

  return {
    user, loyalty, activeOrders, locations, locationId, location, ready, error, needLogin,
    boot, logout, setLocation, refreshProfile, refreshLoyalty, update, setPhone,
  }
})
