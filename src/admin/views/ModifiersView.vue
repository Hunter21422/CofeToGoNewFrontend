<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { CategoryAdminRead, ModifierGroupAdminRead, ProductAdminRead } from '@/shared/api/types'
import UiBadge from '@/shared/components/UiBadge.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSegmented from '@/shared/components/UiSegmented.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import UiSwitch from '@/shared/components/UiSwitch.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { money } from '@/shared/utils/format'

const groups = ref<ModifierGroupAdminRead[]>([])
const open = ref(false)
const editing = ref<ModifierGroupAdminRead | null>(null)
const saving = ref(false)
const ANY = 99
const form = reactive({
  name: '',
  required: false,
  mode: 'one' as 'one' | 'many',
  limit: '',
  is_active: true,
  modifiers: [] as { id: number | null; name: string; price: string; is_default: boolean; is_active: boolean }[],
})

onMounted(async () => (groups.value = await adminApi.modifierGroups()))

const products = ref<ProductAdminRead[]>([])
const categories = ref<CategoryAdminRead[]>([])
const linked = ref<number[]>([])
const linkedLoading = ref(false)
async function loadLinks(g: ModifierGroupAdminRead | null) {
  linkedLoading.value = true
  try {
    if (!products.value.length) {
      const [p, c] = await Promise.all([adminApi.products({ is_active: true, limit: 500 }), adminApi.categories()])
      products.value = p.items
      categories.value = c
    }
    linked.value = g ? await adminApi.groupProducts(g.id) : []
  } catch (e) {
    toastError(e)
  } finally {
    linkedLoading.value = false
  }
}
const byCategory = computed(() =>
  categories.value
    .map((c) => ({ id: c.id, name: c.name, items: products.value.filter((p) => p.category_id === c.id) }))
    .filter((c) => c.items.length),
)
function toggleLinked(id: number) {
  linked.value = linked.value.includes(id) ? linked.value.filter((x) => x !== id) : [...linked.value, id]
}
function linkDrinks() {
  linked.value = [...new Set([...linked.value, ...products.value.filter((p) => p.counts_for_loyalty).map((p) => p.id)])]
}

function edit(g: ModifierGroupAdminRead | null) {
  editing.value = g
  Object.assign(form, {
    name: g?.name ?? '',
    required: (g?.min_select ?? 0) > 0,
    mode: (g?.max_select ?? 1) > 1 ? 'many' : 'one',
    limit: g && g.max_select > 1 && g.max_select < ANY ? String(g.max_select) : '',
    is_active: g?.is_active ?? true,
    modifiers: (g?.modifiers ?? []).map((m) => ({ id: m.id, name: m.name, price: m.price_delta ? String(m.price_delta / 100) : '', is_default: m.is_default, is_active: m.is_active })),
  })
  if (!form.modifiers.length) form.modifiers.push({ id: null, name: '', price: '', is_default: false, is_active: true })
  open.value = true
  loadLinks(g)
}

async function save() {
  const mods = form.modifiers.filter((m) => m.name.trim())
  if (!form.name.trim() || !mods.length) return toast('Нужны название группы и хотя бы одна добавка', 'error')
  const limit = form.mode === 'many' && form.limit.trim() ? Math.floor(Number(form.limit)) : 0
  if (form.mode === 'many' && form.limit.trim() && !(limit >= 2)) return toast('Ограничение — число от 2, или оставьте поле пустым', 'error')
  const max = form.mode === 'many' ? limit || ANY : 1
  if (mods.filter((m) => m.is_default).length > max) return toast('По умолчанию отмечено больше добавок, чем можно выбрать', 'error')
  saving.value = true
  const payload = {
    name: form.name.trim(),
    min_select: form.required ? 1 : 0,
    max_select: max,
    is_active: form.is_active,
    modifiers: mods.map((m, i) => ({ id: m.id, name: m.name.trim(), price_delta: Math.round(Number(m.price.replace(',', '.') || 0) * 100), is_default: m.is_default, is_active: m.is_active, sort_order: i })),
  }
  try {
    let id: number
    if (editing.value) {
      Object.assign(editing.value, await adminApi.updateModifierGroup(editing.value.id, payload))
      id = editing.value.id
    } else {
      const g = await adminApi.createModifierGroup(payload)
      groups.value.push(g)
      id = g.id
    }
    if (!linkedLoading.value) await adminApi.setGroupProducts(id, linked.value)
    open.value = false
    toast('Группа добавок сохранена', 'ok')
  } catch (e) {
    toastError(e)
  } finally {
    saving.value = false
  }
}
async function remove() {
  if (!editing.value || !confirm(`Удалить группу «${editing.value.name}»? Она пропадёт у всех товаров.`)) return
  await adminApi.deleteModifierGroup(editing.value.id)
  groups.value = groups.value.filter((g) => g.id !== editing.value!.id)
  open.value = false
}
function rule(g: { min_select: number; max_select: number; modifiers: unknown[] }) {
  const need = g.min_select > 0 ? 'Обязательно' : 'По желанию'
  if (g.max_select === 1) return `${need}, одна`
  if (g.max_select >= g.modifiers.length) return `${need}, сколько угодно`
  return `${need}, до ${g.max_select}`
}
</script>

<template>
  <main class="page">
    <header class="page-head">
      <h1>Добавки</h1>
      <UiButton @click="edit(null)"><Plus :size="18" />Группа</UiButton>
    </header>
    <p class="muted intro">Молоко, сиропы, доп. шот. Группу подключаете к товару в его карточке в разделе «Меню».</p>

    <div class="grid">
      <button v-for="g in groups" :key="g.id" class="card grp" :class="{ off: !g.is_active }" @click="edit(g)">
        <span class="gh">
          <span class="gn">{{ g.name }}</span>
          <UiBadge :tone="g.min_select > 0 ? 'warn' : 'neutral'">{{ rule(g) }}</UiBadge>
        </span>
        <span class="mods">
          <span v-for="m in g.modifiers" :key="m.id" class="mod" :class="{ off: !m.is_active }">
            <span>{{ m.name }}</span>
            <b>{{ m.price_delta ? `+${money(m.price_delta)}` : 'бесплатно' }}</b>
          </span>
        </span>
      </button>
    </div>

    <UiSheet :open="open" :title="editing ? editing.name : 'Новая группа'" @close="open = false">
      <div class="form">
        <UiField v-model="form.name" label="Название группы" placeholder="Сироп" />
        <div>
          <span class="label">Сколько можно выбрать</span>
          <UiSegmented
            v-model="form.mode"
            label="Сколько можно выбрать"
            :options="[
              { value: 'one', label: 'Одну', hint: 'молоко, размер' },
              { value: 'many', label: 'Несколько', hint: 'сиропы, топпинги' },
            ]"
          />
        </div>
        <UiField
          v-if="form.mode === 'many'"
          v-model="form.limit"
          type="number"
          inputmode="numeric"
          label="Не больше"
          placeholder="Без ограничений"
          hint="Пусто — гость выберет сколько захочет, цена каждой добавки прибавится к напитку"
        />
        <UiSwitch v-model="form.required" label="Обязательный выбор" hint="Без выбора из этой группы напиток не добавить в корзину" />
        <UiSwitch v-model="form.is_active" label="Группа включена" />

        <div>
          <span class="label">Добавки</span>
          <div class="rows">
            <div v-for="(m, i) in form.modifiers" :key="i" class="mrow">
              <UiField v-model="m.name" placeholder="Название" />
              <UiField v-model="m.price" placeholder="0" suffix="₽" inputmode="decimal" />
              <label class="dflt"><input v-model="m.is_default" type="checkbox" />по умолч.</label>
              <button class="rm" aria-label="Убрать" @click="form.modifiers.splice(i, 1)"><Trash2 :size="16" /></button>
            </div>
          </div>
          <UiButton variant="ghost" size="sm" @click="form.modifiers.push({ id: null, name: '', price: '', is_default: false, is_active: true })">
            <Plus :size="16" />Добавка
          </UiButton>
        </div>

        <div class="links">
          <div class="links-head">
            <span class="label">Показывать у товаров <span class="faint num">{{ linked.length }}</span></span>
            <div class="links-acts">
              <button type="button" class="lnk" @click="linkDrinks">Все напитки</button>
              <button v-if="linked.length" type="button" class="lnk" @click="linked = []">Снять все</button>
            </div>
          </div>
          <p v-if="linkedLoading" class="muted small-t">Загружаем товары…</p>
          <p v-else-if="!byCategory.length" class="muted small-t">В меню пока нет товаров.</p>
          <div v-for="c in byCategory" v-else :key="c.id" class="lcat">
            <span class="lcat-name">{{ c.name }}</span>
            <label v-for="p in c.items" :key="p.id" class="lprod" :class="{ on: linked.includes(p.id) }">
              <input type="checkbox" :checked="linked.includes(p.id)" @change="toggleLinked(p.id)" />
              {{ p.name }}
            </label>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="foot2">
          <UiButton v-if="editing" variant="danger" @click="remove">Удалить</UiButton>
          <UiButton block :loading="saving" @click="save">Сохранить</UiButton>
        </div>
      </template>
    </UiSheet>
  </main>
</template>

<style scoped>
.links {
  display: grid;
  gap: 10px;
}
.links-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.links-acts {
  display: flex;
  gap: 12px;
}
.lnk {
  color: var(--primary);
  font-weight: 600;
  font-size: var(--fs-13);
}
.small-t {
  margin: 0;
  font-size: var(--fs-13);
}
.lcat {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.lcat-name {
  width: 100%;
  font-size: var(--fs-11);
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.lprod {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--surface-2);
  font-size: var(--fs-13);
  cursor: pointer;
}
.lprod.on {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 600;
}
.lprod input {
  accent-color: var(--primary);
}
.intro {
  margin: -8px 0 16px;
  max-width: 60ch;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.grp {
  display: grid;
  gap: 12px;
  text-align: left;
  align-content: start;
}
.grp:hover {
  box-shadow: var(--shadow-lift);
}
.grp.off {
  opacity: 0.55;
}
.gh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.gn {
  font-family: var(--font-display);
  font-weight: 600;
}
.mods {
  display: grid;
  width: 100%;
}
.mod {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-top: 1px solid var(--line);
  font-size: var(--fs-13);
  text-align: left;
}
.mod b {
  font-weight: 500;
  color: var(--ink-3);
  white-space: nowrap;
}
.mod.off {
  text-decoration: line-through;
  color: var(--ink-3);
}
.rows {
  display: grid;
  gap: 6px;
  margin: 6px 0;
}
.mrow {
  display: grid;
  grid-template-columns: 1fr 100px auto 30px;
  gap: 6px;
  align-items: center;
}
.mrow :deep(.ctl) {
  min-height: 42px;
}
.dflt {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-11);
  color: var(--ink-3);
  white-space: nowrap;
}
.dflt input {
  accent-color: var(--primary);
}
.rm {
  color: var(--ink-3);
}
.foot2 {
  display: flex;
  gap: 8px;
}
</style>
