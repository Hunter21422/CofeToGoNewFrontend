<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { LocationHours, LocationRead, PaymentMethod } from '@/shared/api/types'
import UiBadge from '@/shared/components/UiBadge.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import UiSwitch from '@/shared/components/UiSwitch.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { PAYMENT_LABEL, WEEKDAYS_FULL } from '@/shared/utils/format'

const locations = ref<LocationRead[]>([])
const editing = ref<LocationRead | null>(null)
const hours = ref<LocationHours[]>([])
const prep = ref<number | string>(7)
const methods = ref<PaymentMethod[]>([])
const saving = ref(false)
const ALL: PaymentMethod[] = ['card_on_pickup', 'cash']

onMounted(async () => (locations.value = await adminApi.locations()))

const DEFAULT_HOURS: LocationHours[] = Array.from({ length: 7 }, (_, weekday) => ({ weekday, opens_at: '08:00', closes_at: '22:00', is_closed: false }))
const creating = ref(false)
const form = ref({ name: '', address: '', phone: '' })

const TR: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ы: 'y', э: 'e', ю: 'yu', я: 'ya' }
function slugify(s: string) {
  const base = [...s.toLowerCase()].map((c) => TR[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return `${base || 'point'}-${Date.now().toString(36).slice(-4)}`
}
function openCreate() {
  form.value = { name: '', address: '', phone: '' }
  creating.value = true
}
async function create() {
  const f = form.value
  if (!f.name.trim() || f.address.trim().length < 3) return toast('Укажите название и адрес', 'error')
  saving.value = true
  try {
    const l = await adminApi.createLocation({
      name: f.name.trim(),
      slug: slugify(f.name),
      address: f.address.trim(),
      phone: f.phone.trim() || null,
      payment_methods: ['card_on_pickup', 'cash'],
    })
    locations.value.push(l)
    creating.value = false
    toast('Точка создана. Задайте часы работы и оплату', 'ok')
    edit(l)
  } catch (e) {
    toastError(e)
  } finally {
    saving.value = false
  }
}

function edit(l: LocationRead) {
  editing.value = l
  hours.value = (l.hours.length ? l.hours : DEFAULT_HOURS).map((h) => ({ ...h }))
  prep.value = l.avg_prep_minutes
  methods.value = l.payment_methods.filter((m) => ALL.includes(m))
}
async function toggle(l: LocationRead, v: boolean) {
  Object.assign(l, await adminApi.updateLocation(l.id, { accepts_orders: v }))
  toast(v ? `${l.name}: заказы принимаются` : `${l.name}: онлайн-заказы на паузе`, 'ok')
}
async function save() {
  const l = editing.value
  if (!l) return
  if (!methods.value.length) return toast('Оставьте хотя бы один способ оплаты', 'error')
  saving.value = true
  try {
    await adminApi.updateHours(l.id, hours.value)
    Object.assign(l, await adminApi.updateLocation(l.id, { avg_prep_minutes: Number(prep.value), payment_methods: methods.value.filter((m) => ALL.includes(m)) }))
    editing.value = null
    toast('Точка обновлена', 'ok')
  } catch (e) {
    toastError(e)
  } finally {
    saving.value = false
  }
}
const today = (l: LocationRead) => {
  const h = l.hours.find((x) => x.weekday === (new Date().getDay() + 6) % 7)
  return h && !h.is_closed ? `${h.opens_at}–${h.closes_at}` : 'выходной'
}
</script>

<template>
  <main class="page">
    <header class="page-head">
      <h1>Точки</h1>
      <UiButton @click="openCreate"><Plus :size="18" />Точка</UiButton>
    </header>
    <p v-if="!locations.length" class="muted">Пока ни одной кофейни. Добавьте первую — без неё гости не увидят меню.</p>
    <div class="grid">
      <article v-for="l in locations" :key="l.id" class="card loc">
        <header class="lh">
          <div>
            <h2 class="ln">{{ l.name }}</h2>
            <p class="faint">{{ l.address }}</p>
          </div>
          <UiBadge :tone="l.is_open_now ? 'ok' : 'neutral'" dot>{{ l.is_open_now ? 'Открыта' : 'Закрыта' }}</UiBadge>
        </header>
        <dl class="facts">
          <div><dt>Сегодня</dt><dd>{{ today(l) }}</dd></div>
          <div><dt>Готовим</dt><dd>~{{ l.avg_prep_minutes }} мин</dd></div>
          <div><dt>Оплата</dt><dd>{{ l.payment_methods.map((m) => (m === 'cash' ? 'наличные' : 'карта')).join(', ') }}</dd></div>
        </dl>
        <UiSwitch :model-value="l.accepts_orders" label="Принимать онлайн-заказы" hint="Выключите, если завал или что-то сломалось" @update:model-value="(v: boolean) => toggle(l, v)" />
        <UiButton variant="secondary" @click="edit(l)">Часы работы и оплата</UiButton>
      </article>
    </div>

    <UiSheet :open="!!editing" :title="editing?.name" @close="editing = null">
      <div class="form">
        <section>
          <span class="label">Часы работы</span>
          <div class="hours">
            <div v-for="h in hours" :key="h.weekday" class="hr" :class="{ closed: h.is_closed }">
              <span class="wd">{{ WEEKDAYS_FULL[h.weekday] }}</span>
              <input v-model="h.opens_at" type="time" class="select" :disabled="h.is_closed" aria-label="Открытие" />
              <input v-model="h.closes_at" type="time" class="select" :disabled="h.is_closed" aria-label="Закрытие" />
              <label class="cl"><input v-model="h.is_closed" type="checkbox" />выходной</label>
            </div>
          </div>
        </section>
        <UiField v-model="prep" type="number" label="Среднее время приготовления" suffix="мин" hint="Гость увидит «будет готово через ~N минут»" />
        <section>
          <span class="label">Способы оплаты</span>
          <div class="pm">
            <label v-for="m in ALL" :key="m" class="chip-filter" :class="{ on: methods.includes(m) }">
              <input v-model="methods" type="checkbox" :value="m" class="visually-hidden" />{{ PAYMENT_LABEL[m] }}
            </label>
          </div>
        </section>
      </div>
      <template #footer><UiButton block size="lg" :loading="saving" @click="save">Сохранить</UiButton></template>
    </UiSheet>
    <UiSheet :open="creating" title="Новая точка" @close="creating = false">
      <div class="form">
        <UiField v-model="form.name" label="Название" placeholder="Кофе с тобой на Ленина" />
        <UiField v-model="form.address" label="Адрес" placeholder="ул. Ленина, 1" />
        <UiField v-model="form.phone" label="Телефон" placeholder="+7 999 123-45-67" hint="Необязательно" />
      </div>
      <template #footer><UiButton block size="lg" :loading="saving" @click="create">Создать</UiButton></template>
    </UiSheet>
  </main>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}
.loc {
  display: grid;
  gap: 12px;
}
.lh {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
.ln {
  font-size: var(--fs-17);
}
.lh p {
  font-size: var(--fs-13);
}
.facts {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.facts div {
  padding: 10px;
  border-radius: 12px;
  background: var(--surface-2);
}
.facts dt {
  font-size: var(--fs-11);
  color: var(--ink-3);
}
.facts dd {
  margin: 2px 0 0;
  font-weight: 600;
  font-size: var(--fs-13);
}
.hours {
  display: grid;
  gap: 6px;
  margin-top: 6px;
}
.hr {
  display: grid;
  grid-template-columns: 1fr 104px 104px auto;
  gap: 6px;
  align-items: center;
  font-size: var(--fs-13);
}
.hr .select {
  height: 38px;
  padding: 0 8px;
}
.hr.closed .wd {
  color: var(--ink-3);
}
.cl {
  display: flex;
  gap: 4px;
  align-items: center;
  color: var(--ink-3);
  font-size: var(--fs-11);
}
.cl input {
  accent-color: var(--primary);
}
.pm {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.pm .chip-filter {
  background: var(--surface-2);
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
</style>
