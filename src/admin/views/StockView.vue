<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { ModifierGroupAdminRead, ProductAdminRead, StockItemRead } from '@/shared/api/types'
import ProductArt from '@/shared/components/ProductArt.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSegmented from '@/shared/components/UiSegmented.vue'
import UiSwitch from '@/shared/components/UiSwitch.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { tg } from '@/shared/telegram'
import { time, when } from '@/shared/utils/format'
import { useAdmin } from '../stores/admin'

const admin = useAdmin()
const stock = ref<StockItemRead[]>([])
const products = ref<ProductAdminRead[]>([])
const groups = ref<ModifierGroupAdminRead[]>([])
const tab = ref<'products' | 'modifiers'>('products')
const q = ref('')
const untilEod = ref(true)

async function load() {
  if (!admin.locationId) return
  const [s, p, g] = await Promise.all([adminApi.stock(admin.locationId), adminApi.products({ is_active: true, limit: 500 }), adminApi.modifierGroups()])
  stock.value = s
  products.value = p.items
  groups.value = g
}
onMounted(load)

const byProduct = computed(() => new Map(stock.value.filter((s) => s.product_id).map((s) => [s.product_id!, s])))
const byModifier = computed(() => new Map(stock.value.filter((s) => s.modifier_id).map((s) => [s.modifier_id!, s])))
const filtered = computed(() => products.value.filter((p) => !q.value || p.name.toLowerCase().includes(q.value.toLowerCase())))

async function setProduct(id: number, available: boolean, name: string) {
  if (!admin.locationId) return
  tg.haptic.tap()
  try {
    if (available) {
      const s = byProduct.value.get(id)
      if (s) await adminApi.removeStock(admin.locationId, s.id)
      toast(`${name} снова в продаже`, 'ok')
    } else {
      await adminApi.addStock(admin.locationId, { product_id: id, until_end_of_day: untilEod.value, reason: 'Закончилось' })
      toast(`${name} в стоп-листе${untilEod.value ? ' до конца дня' : ''}`, 'ok')
    }
    await load()
  } catch (e) {
    toastError(e)
  }
}
async function setModifier(id: number, available: boolean, name: string) {
  if (!admin.locationId) return
  try {
    if (available) {
      const s = byModifier.value.get(id)
      if (s) await adminApi.removeStock(admin.locationId, s.id)
    } else await adminApi.addStock(admin.locationId, { modifier_id: id, until_end_of_day: untilEod.value })
    toast(available ? `${name} снова есть` : `${name} в стоп-листе`, 'ok')
    await load()
  } catch (e) {
    toastError(e)
  }
}
</script>

<template>
  <main class="page">
    <header class="page-head">
      <h1>Стоп-лист</h1>
      <span class="faint">{{ admin.location?.name }}</span>
    </header>

    <section v-if="stock.length" class="card now">
      <h2 class="card-title">Сейчас нет в продаже: {{ stock.length }}</h2>
      <div class="chips">
        <span v-for="s in stock" :key="s.id" class="stop">
          {{ s.title }}
          <span class="faint">{{ s.until ? `до ${time(s.until)}` : `с ${when(s.created_at)}` }}</span>
        </span>
      </div>
    </section>

    <div class="toolbar">
      <UiSegmented
        v-model="tab"
        size="sm"
        :options="[
          { value: 'products', label: 'Товары' },
          { value: 'modifiers', label: 'Добавки' },
        ]"
      />
      <div v-if="tab === 'products'" class="q">
        <UiField v-model="q" placeholder="Найти">
          <template #prefix><Search :size="16" class="faint" /></template>
        </UiField>
      </div>
      <UiSwitch v-model="untilEod" label="Вернуть автоматически утром" class="eod" />
    </div>

    <div v-if="tab === 'products'" class="card list">
      <div v-for="p in filtered" :key="p.id" class="item" :class="{ out: byProduct.has(p.id) }">
        <ProductArt :slug="p.slug" :image-url="p.image_url" :size="40" />
        <span class="nm">{{ p.name }}</span>
        <span v-if="byProduct.has(p.id)" class="tag">нет в продаже</span>
        <UiSwitch :model-value="!byProduct.has(p.id)" @update:model-value="(v: boolean) => setProduct(p.id, v, p.name)" />
      </div>
    </div>

    <div v-else class="mgrid">
      <section v-for="g in groups" :key="g.id" class="card">
        <h2 class="card-title">{{ g.name }}</h2>
        <div v-for="m in g.modifiers" :key="m.id" class="item" :class="{ out: byModifier.has(m.id) }">
          <span class="nm">{{ m.name }}</span>
          <span v-if="byModifier.has(m.id)" class="tag">нет</span>
          <UiSwitch :model-value="!byModifier.has(m.id)" @update:model-value="(v: boolean) => setModifier(m.id, v, m.name)" />
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.now {
  margin-bottom: 16px;
  background: var(--warn-soft);
}
.now .card-title {
  color: var(--warn);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.stop {
  display: inline-flex;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--r-pill);
  background: var(--surface);
  font-weight: 600;
  font-size: var(--fs-13);
}
.q {
  width: 240px;
}
.q :deep(.ctl) {
  background: var(--surface);
  min-height: 38px;
}
.eod {
  margin-left: auto;
  font-size: var(--fs-13);
}
.list {
  padding: 4px 16px;
  column-width: 340px;
  column-gap: 32px;
}
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  border-bottom: 1px solid var(--line);
  break-inside: avoid;
}
.item.out .nm {
  color: var(--ink-3);
  text-decoration: line-through;
}
.nm {
  flex: 1;
  font-weight: 500;
}
.tag {
  font-size: var(--fs-11);
  font-weight: 700;
  color: var(--danger);
}
.mgrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
</style>
