import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { clientApi } from '@/shared/api/client'
import type { CartQuoteOut, OrderType, PaymentMethod } from '@/shared/api/types'

export interface CartLine {
  key: string // product+variant+mods — одинаковые сборки складываются
  product_id: number
  variant_id: number
  modifier_ids: number[]
  quantity: number
  // для отрисовки без запроса
  name: string
  slug: string
  image_url: string | null
  variant_name: string
  modifier_names: string[]
  unit_price: number
  counts_for_loyalty: boolean
}

const KEY = 'kofe.cart'

function read(): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export const useCart = defineStore('cart', () => {
  const lines = ref<CartLine[]>(read())
  const promoCode = ref<string | null>(null)
  const useGift = ref(false)
  const pickupAt = ref<string | null>(null)
  const orderType = ref<OrderType>('pickup')
  const paymentMethod = ref<PaymentMethod>('card_on_pickup')
  const comment = ref('')

  const quote = ref<CartQuoteOut | null>(null)
  const quoting = ref(false)
  const quoteError = ref<string | null>(null)

  watch(
    lines,
    (v) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(v))
      } catch {
        /* ignore */
      }
    },
    { deep: true },
  )

  const count = computed(() => lines.value.reduce((a, l) => a + l.quantity, 0))
  const localTotal = computed(() => lines.value.reduce((a, l) => a + l.unit_price * l.quantity, 0))
  const total = computed(() => quote.value?.total ?? localTotal.value)

  function add(line: Omit<CartLine, 'key'>) {
    const key = `${line.product_id}:${line.variant_id}:${[...line.modifier_ids].sort((a, b) => a - b).join(',')}`
    const ex = lines.value.find((l) => l.key === key)
    if (ex) ex.quantity = Math.min(20, ex.quantity + line.quantity)
    else lines.value.push({ ...line, key })
  }
  function setQty(key: string, q: number) {
    const l = lines.value.find((x) => x.key === key)
    if (!l) return
    if (q <= 0) lines.value = lines.value.filter((x) => x.key !== key)
    else l.quantity = q
  }
  function clear() {
    lines.value = []
    promoCode.value = null
    useGift.value = false
    pickupAt.value = null
    comment.value = ''
    quote.value = null
  }

  let seq = 0
  async function requote(locationId: number) {
    if (!lines.value.length) {
      quote.value = null
      return
    }
    const my = ++seq
    quoting.value = true
    quoteError.value = null
    try {
      const q = await clientApi.quote({
        location_id: locationId,
        items: lines.value.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, modifier_ids: l.modifier_ids, quantity: l.quantity })),
        promo_code: promoCode.value,
        use_gift: useGift.value,
        pickup_at: pickupAt.value,
      })
      if (my === seq) quote.value = q
    } catch (e) {
      if (my === seq) quoteError.value = e instanceof Error ? e.message : 'Не удалось посчитать корзину'
    } finally {
      if (my === seq) quoting.value = false
    }
  }

  return {
    lines, promoCode, useGift, pickupAt, orderType, paymentMethod, comment,
    quote, quoting, quoteError, count, localTotal, total, add, setQty, clear, requote,
  }
})
