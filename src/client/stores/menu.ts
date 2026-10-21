import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { clientApi } from '@/shared/api/client'
import type { MenuOut, ProductRead, ProductShort } from '@/shared/api/types'

export const useMenu = defineStore('menu', () => {
  const menu = ref<MenuOut | null>(null)
  const loadedFor = ref<number | null>(null)
  const loading = ref(false)
  const products = new Map<string, ProductRead>()

  // Карточка товара открывается шторкой поверх любого экрана
  const openedProductId = ref<number | null>(null)

  const allProducts = computed<ProductShort[]>(() => menu.value?.categories.flatMap((c) => c.products) ?? [])
  const catByProduct = computed(() => new Map(menu.value?.categories.flatMap((c) => c.products.map((p) => [p.id, `${c.slug} ${c.name}`] as const)) ?? []))
  const categoryOf = (id: number | null | undefined) => (id ? catByProduct.value.get(id) ?? null : null)
  const hits = computed(() => allProducts.value.filter((p) => p.tags.includes('hit') || p.tags.includes('new')))

  async function load(locationId: number, force = false) {
    if (!force && loadedFor.value === locationId && menu.value) return
    loading.value = true
    try {
      menu.value = await clientApi.menu(locationId)
      loadedFor.value = locationId
      products.clear()
    } finally {
      loading.value = false
    }
  }

  async function product(locationId: number, id: number, force = false): Promise<ProductRead> {
    const key = `${locationId}:${id}`
    if (!force && products.has(key)) return products.get(key)!
    const p = await clientApi.product(locationId, id)
    products.set(key, p)
    return p
  }

  function invalidateProduct(locationId: number, id: number) {
    products.delete(`${locationId}:${id}`)
  }

  const open = (id: number) => (openedProductId.value = id)
  const close = () => (openedProductId.value = null)

  return { menu, loading, allProducts, hits, categoryOf, openedProductId, load, product, invalidateProduct, open, close }
})
