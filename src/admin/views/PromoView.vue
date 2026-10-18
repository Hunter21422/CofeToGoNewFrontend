<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { ProductAdminRead, PromoCodeRead, PromoType } from '@/shared/api/types'
import UiBadge from '@/shared/components/UiBadge.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSegmented from '@/shared/components/UiSegmented.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import UiSwitch from '@/shared/components/UiSwitch.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { dateShort, money } from '@/shared/utils/format'

const promos = ref<PromoCodeRead[]>([])
const products = ref<ProductAdminRead[]>([])
const open = ref(false)
const saving = ref(false)
const form = reactive({
  code: '', description: '', type: 'percent' as PromoType, value: '', product_id: null as number | null,
  min_order_total: '', max_discount: '', ends_at: '', usage_limit_total: '', usage_limit_per_user: '1', first_order_only: false,
})

onMounted(async () => {
  const [p, pr] = await Promise.all([adminApi.promos({ limit: 200 }), adminApi.products({ limit: 500 })])
  promos.value = p.items
  products.value = pr.items
})

function describe(p: PromoCodeRead) {
  if (p.type === 'percent') return `−${p.value}%${p.max_discount ? `, не больше ${money(p.max_discount)}` : ''}`
  if (p.type === 'fixed') return `−${money(p.value)}`
  return `${products.value.find((x) => x.id === p.product_id)?.name ?? 'Товар'} в подарок`
}
function state(p: PromoCodeRead): { t: string; tone: 'ok' | 'neutral' | 'danger' } {
  if (!p.is_active) return { t: 'Выключен', tone: 'neutral' }
  if (p.ends_at && new Date(p.ends_at) < new Date()) return { t: 'Истёк', tone: 'danger' }
  if (p.usage_limit_total && p.used_count >= p.usage_limit_total) return { t: 'Исчерпан', tone: 'danger' }
  return { t: 'Работает', tone: 'ok' }
}
async function toggle(p: PromoCodeRead, v: boolean) {
  Object.assign(p, await adminApi.updatePromo(p.id, { is_active: v }))
}

const kop = (s: string) => (s ? Math.round(Number(s.replace(',', '.')) * 100) : null)
async function create() {
  const code = form.code.trim().toUpperCase()
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return toast('Код: 3–32 символа, латиница и цифры', 'error')
  const value = form.type === 'percent' ? Number(form.value) : form.type === 'fixed' ? kop(form.value) ?? 0 : 0
  if (form.type === 'percent' && !(value >= 1 && value <= 100)) return toast('Процент — от 1 до 100', 'error')
  if (form.type === 'fixed' && !(value > 0)) return toast('Укажите сумму скидки', 'error')
  if (form.type === 'free_product' && !form.product_id) return toast('Выберите товар в подарок', 'error')
  saving.value = true
  try {
    const p = await adminApi.createPromo({
      code, description: form.description || null, type: form.type, value, product_id: form.product_id,
      min_order_total: kop(form.min_order_total), max_discount: kop(form.max_discount), starts_at: null,
      ends_at: form.ends_at ? new Date(form.ends_at + 'T23:59:00').toISOString() : null,
      usage_limit_total: form.usage_limit_total ? Number(form.usage_limit_total) : null,
      usage_limit_per_user: form.usage_limit_per_user ? Number(form.usage_limit_per_user) : null,
      first_order_only: form.first_order_only, location_ids: null,
    })
    promos.value.unshift(p)
    open.value = false
    toast(`Промокод ${p.code} создан`, 'ok')
  } catch (e) {
    toastError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="page">
    <header class="page-head">
      <h1>Промокоды</h1>
      <UiButton @click="open = true"><Plus :size="18" />Промокод</UiButton>
    </header>

    <div class="table-wrap">
      <table class="t">
        <thead><tr><th>Код</th><th>Что даёт</th><th>Условия</th><th class="r">Использован</th><th>Статус</th><th>Вкл.</th></tr></thead>
        <tbody>
          <tr v-for="p in promos" :key="p.id">
            <td><span class="code">{{ p.code }}</span><span v-if="p.description" class="sub">{{ p.description }}</span></td>
            <td class="strong">{{ describe(p) }}</td>
            <td class="faint cond">
              <span v-if="p.min_order_total">от {{ money(p.min_order_total) }}</span>
              <span v-if="p.first_order_only">только первый заказ</span>
              <span v-if="p.usage_limit_per_user">{{ p.usage_limit_per_user }} раз на гостя</span>
              <span v-if="p.ends_at">до {{ dateShort(p.ends_at) }}</span>
            </td>
            <td class="r num">{{ p.used_count }}<span v-if="p.usage_limit_total" class="faint"> / {{ p.usage_limit_total }}</span></td>
            <td><UiBadge :tone="state(p).tone" dot>{{ state(p).t }}</UiBadge></td>
            <td><UiSwitch :model-value="p.is_active" @update:model-value="(v: boolean) => toggle(p, v)" /></td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiSheet :open="open" title="Новый промокод" @close="open = false">
      <div class="form">
        <UiField v-model="form.code" label="Код" placeholder="AUTUMN15" mono />
        <UiField v-model="form.description" label="Описание для команды" placeholder="Осенняя акция в соцсетях" />
        <UiSegmented
          v-model="form.type"
          :options="[
            { value: 'percent', label: 'Процент' },
            { value: 'fixed', label: 'Сумма' },
            { value: 'free_product', label: 'Товар' },
          ]"
        />
        <div class="form-row">
          <UiField v-if="form.type === 'percent'" v-model="form.value" label="Скидка" suffix="%" inputmode="numeric" />
          <UiField v-if="form.type === 'percent'" v-model="form.max_discount" label="Не больше" suffix="₽" inputmode="decimal" />
          <UiField v-if="form.type === 'fixed'" v-model="form.value" label="Скидка" suffix="₽" inputmode="decimal" />
          <label v-if="form.type === 'free_product'" class="sel">
            <span class="label">Товар в подарок</span>
            <select v-model="form.product_id" class="select">
              <option :value="null" disabled>Выберите</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </label>
          <UiField v-model="form.min_order_total" label="Заказ от" suffix="₽" inputmode="decimal" />
        </div>
        <div class="form-row">
          <UiField v-model="form.usage_limit_total" label="Всего активаций" placeholder="без лимита" inputmode="numeric" />
          <UiField v-model="form.usage_limit_per_user" label="На одного гостя" inputmode="numeric" />
          <UiField v-model="form.ends_at" type="date" label="Действует до" />
        </div>
        <UiSwitch v-model="form.first_order_only" label="Только для первого заказа" />
      </div>
      <template #footer><UiButton block size="lg" :loading="saving" @click="create">Создать промокод</UiButton></template>
    </UiSheet>
  </main>
</template>

<style scoped>
.code {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: 0.04em;
}
.sub {
  display: block;
  font-size: var(--fs-11);
  color: var(--ink-3);
}
.cond {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
}
.sel {
  display: grid;
  gap: 6px;
}
</style>
