<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { CategoryAdminRead, ModifierGroupAdminRead, ProductAdminRead, ProductCreate, VariantIn } from '@/shared/api/types'
import ProductArt from '@/shared/components/ProductArt.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import UiSwitch from '@/shared/components/UiSwitch.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { money, toSlug } from '@/shared/utils/format'

const props = defineProps<{
  open: boolean
  product: ProductAdminRead | null
  categories: CategoryAdminRead[]
  groups: ModifierGroupAdminRead[]
  defaultCategoryId?: number | null
}>()
const emit = defineEmits<{ close: []; saved: [ProductAdminRead]; deleted: [number] }>()
const deleting = ref(false)

interface VariantForm extends Omit<VariantIn, 'price' | 'old_price'> {
  price: string
  old_price: string
}
const NEW_SIZES = [
  { name: 'S', ml: 250 },
  { name: 'M', ml: 350 },
  { name: 'L', ml: 450 },
]
const form = reactive({
  category_id: 0,
  name: '',
  slug: '',
  description: '',
  composition: '',
  image_url: '',
  tags: [] as string[],
  counts_for_loyalty: true,
  is_active: true,
  variants: [] as VariantForm[],
  modifier_ids: [] as number[],
})
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const slugTouched = ref(false)
const catHint = computed(() => {
  const c = props.categories.find((x) => x.id === form.category_id)
  return c ? `${c.slug} ${c.name}` : null
})

const TAGS = [
  { v: 'new', l: 'Новинка' },
  { v: 'hit', l: 'Хит' },
  { v: 'vegan', l: 'Без животных продуктов' },
]

watch(
  () => props.open,
  (o) => {
    if (!o) return
    const p = props.product
    errors.value = {}
    slugTouched.value = !!p
    Object.assign(form, {
      category_id: p?.category_id ?? props.defaultCategoryId ?? props.categories[0]?.id ?? 0,
      name: p?.name ?? '',
      slug: p?.slug ?? '',
      description: p?.description ?? '',
      composition: p?.composition ?? '',
      image_url: p?.image_url ?? '',
      tags: [...(p?.tags ?? [])],
      counts_for_loyalty: p?.counts_for_loyalty ?? true,
      is_active: p?.is_active ?? true,
      variants: (p?.variants ?? NEW_SIZES.map((x, i) => ({ id: null, name: x.name, volume_ml: x.ml, price: 0, old_price: null, is_default: i === 0, is_active: true, sku: null, calories: null, proteins: null, fats: null, carbs: null, sort_order: i }))).map((v) => ({
        ...v,
        price: v.price ? String(v.price / 100) : '',
        old_price: v.old_price ? String(v.old_price / 100) : '',
      })),
      modifier_ids: p?.modifier_groups.flatMap((g) => g.modifiers.map((m) => m.id)) ?? [],
    })
  },
)

const TR: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' }
watch(
  () => form.name,
  (n) => {
    if (slugTouched.value) return
    form.slug = n.toLowerCase().split('').map((c) => TR[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  },
)

function addVariant() {
  form.variants.push({ id: null, name: '', volume_ml: null, price: '', old_price: '', is_default: false, is_active: true, sku: null })
}
function setDefault(i: number) {
  form.variants.forEach((v, j) => (v.is_default = i === j))
}
function toggleTag(t: string) {
  form.tags = form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t]
}
const picked = (id: number) => form.modifier_ids.includes(id)
const groupState = (g: ModifierGroupAdminRead) => {
  const n = g.modifiers.filter((m) => picked(m.id)).length
  return n === 0 ? 'none' : n === g.modifiers.length ? 'all' : 'some'
}
function toggleGroup(g: ModifierGroupAdminRead) {
  const ids = g.modifiers.map((m) => m.id)
  form.modifier_ids = groupState(g) === 'all' ? form.modifier_ids.filter((x) => !ids.includes(x)) : [...new Set([...form.modifier_ids, ...ids])]
}
function toggleMod(id: number) {
  form.modifier_ids = picked(id) ? form.modifier_ids.filter((x) => x !== id) : [...form.modifier_ids, id]
}

const rub = (s: string) => Math.round(Number(String(s).replace(',', '.')) * 100)
function validate() {
  const e: Record<string, string> = {}
  if (!form.name.trim()) e.name = 'Назовите товар'
  form.slug = toSlug(form.slug || form.name)
  if (!form.slug) e.slug = 'Только латиница, цифры и дефис'
  if (form.variants.length > 1) form.variants = form.variants.filter((v, i) => i === 0 || String(v.price).trim() || v.id)
  if (!form.variants.length) e.variants = 'Нужен хотя бы один размер'
  form.variants.forEach((v, i) => {
    if (!v.name.trim()) e[`v${i}name`] = 'Название'
    if (!(rub(v.price) > 0)) e[`v${i}price`] = 'Цена'
    if (v.old_price && rub(v.old_price) <= rub(v.price)) e[`v${i}old`] = 'Должна быть выше цены'
  })
  errors.value = e
  return !Object.keys(e).length
}

async function save() {
  if (!validate()) return toast('Проверьте выделенные поля', 'error')
  saving.value = true
  const payload: ProductCreate & { is_active: boolean } = {
    category_id: form.category_id,
    name: form.name.trim(),
    slug: form.slug,
    description: form.description.trim() || null,
    composition: form.composition.trim() || null,
    image_url: form.image_url.trim() || null,
    tags: form.tags,
    counts_for_loyalty: form.counts_for_loyalty,
    is_active: form.is_active,
    modifier_ids: form.modifier_ids,
    variants: form.variants.map((v, i) => ({
      id: v.id ?? null, name: v.name.trim(), volume_ml: v.volume_ml ? Number(v.volume_ml) : null, price: rub(v.price),
      old_price: v.old_price ? rub(v.old_price) : null, sku: v.sku ?? null, is_default: v.is_default, sort_order: i, is_active: v.is_active,
    })),
  }
  if (!payload.variants.some((v) => v.is_default)) payload.variants[0].is_default = true
  try {
    const saved = props.product ? await adminApi.updateProduct(props.product.id, payload) : await adminApi.createProduct(payload)
    toast(props.product ? 'Изменения сохранены' : 'Товар добавлен в меню', 'ok')
    emit('saved', saved)
  } catch (e) {
    toastError(e)
  } finally {
    saving.value = false
  }
}
async function remove() {
  const p = props.product
  if (!p) return
  if (!confirm(`Удалить «${p.name}» из меню насовсем? Старые заказы останутся в истории. Если нужно убрать товар на время — лучше выключите «Показывать в меню».`)) return
  deleting.value = true
  try {
    await adminApi.deleteProduct(p.id)
    toast(`${p.name} удалён`, 'ok')
    emit('deleted', p.id)
  } catch (e) {
    toastError(e)
  } finally {
    deleting.value = false
  }
}
const title = computed(() => (props.product ? props.product.name : 'Новый товар'))
</script>

<template>
  <UiSheet :open="open" :title="title" max-height="94dvh" @close="emit('close')">
    <div class="form">
      <div class="head">
        <ProductArt :slug="form.slug || toSlug(form.name)" :image-url="form.image_url || null" :category="catHint" :size="88" />
        <div class="hf">
          <UiField v-model="form.name" label="Название" :error="errors.name" placeholder="Раф лавандовый" />
          <UiField v-model="form.slug" label="Адрес в меню (slug)" :error="errors.slug" hint="Нужен для ссылок и картинки" mono @input="slugTouched = true" />
        </div>
      </div>

      <div class="form-row">
        <label class="sel">
          <span class="label">Категория</span>
          <select v-model="form.category_id" class="select">
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
          </select>
        </label>
        <UiField v-model="form.image_url" label="Фото (URL)" placeholder="Пусто — нарисуем сами" />
      </div>

      <UiField v-model="form.description" label="Описание" multiline :rows="2" :maxlength="2000" placeholder="Коротко, как бариста объяснил бы гостю" />
      <UiField v-model="form.composition" label="Состав" multiline :rows="2" placeholder="Необязательно" />

      <div>
        <span class="label">Метки</span>
        <div class="chips">
          <button v-for="t in TAGS" :key="t.v" class="chip-filter" :class="{ on: form.tags.includes(t.v) }" @click="toggleTag(t.v)">{{ t.l }}</button>
        </div>
      </div>

      <div class="card flags">
        <UiSwitch v-model="form.counts_for_loyalty" label="Даёт штамп" hint="Для напитков: идёт в счётчик, и этот напиток можно взять подарком. Для десертов выключите" />
        <UiSwitch v-model="form.is_active" label="Показывать в меню" />
      </div>

      <section>
        <div class="sec-head">
          <span class="label">Размеры: объём и цена</span>
          <UiButton size="sm" variant="ghost" @click="addVariant"><Plus :size="16" />Размер</UiButton>
        </div>
        <p v-if="errors.variants" class="err">{{ errors.variants }}</p>
        <div class="variants">
          <div class="variant vhead" aria-hidden="true">
            <span /><span>Размер</span><span>Объём</span><span>Цена</span><span>Старая цена</span><span />
          </div>
          <div v-for="(v, i) in form.variants" :key="i" class="variant">
            <label class="def" :title="'По умолчанию'">
              <input type="radio" name="def" :checked="v.is_default" @change="setDefault(i)" />
              <span class="visually-hidden">По умолчанию</span>
            </label>
            <UiField v-model="v.name" placeholder="M" :error="errors[`v${i}name`]" />
            <UiField v-model="v.volume_ml" placeholder="350" suffix="мл" inputmode="numeric" />
            <UiField v-model="v.price" placeholder="260" suffix="₽" inputmode="decimal" :error="errors[`v${i}price`]" />
            <UiField v-model="v.old_price" placeholder="—" suffix="было" inputmode="decimal" :error="errors[`v${i}old`]" />
            <button class="rm" :disabled="form.variants.length === 1" aria-label="Убрать размер" @click="form.variants.splice(i, 1)"><Trash2 :size="16" /></button>
          </div>
        </div>
        <p class="faint small">Новому товару сразу даём три размера — S, M, L, всё правится с клавиатуры. Размеры без цены при сохранении убираются, так что для десерта просто впишите цену в первую строку («1 шт», объём пустой). Кружок слева — размер по умолчанию.</p>
      </section>

      <section>
        <span class="label">Добавки</span>
        <div class="groups">
          <div v-for="g in groups" :key="g.id" class="grp" :class="{ on: groupState(g) !== 'none' }">
            <label class="ghead">
              <input
                type="checkbox"
                :checked="groupState(g) === 'all'"
                :indeterminate.prop="groupState(g) === 'some'"
                @change="toggleGroup(g)"
              />
              <span class="gn">{{ g.name }}</span>
              <span class="gcount num">{{ g.modifiers.filter((m) => picked(m.id)).length }} из {{ g.modifiers.length }}</span>
            </label>
            <ul class="gm">
              <li v-for="m in g.modifiers" :key="m.id">
                <label class="gopt" :class="{ off: !m.is_active }">
                  <input type="checkbox" :checked="picked(m.id)" @change="toggleMod(m.id)" />
                  <span class="oname">{{ m.name }}</span>
                  <span class="oprice" :class="{ num: m.price_delta }">{{ m.price_delta ? `+${money(m.price_delta)}` : 'бесплатно' }}</span>
                </label>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="foot2">
        <UiButton v-if="product" variant="danger" size="lg" :loading="deleting" @click="remove"><Trash2 :size="18" />Удалить</UiButton>
        <UiButton block size="lg" :loading="saving" @click="save">{{ product ? 'Сохранить' : 'Добавить в меню' }}</UiButton>
      </div>
    </template>
  </UiSheet>
</template>

<style scoped>
.head {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.hf {
  flex: 1;
  display: grid;
  gap: 10px;
}
.sel {
  display: grid;
  gap: 6px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.chips .chip-filter {
  background: var(--surface-2);
}
.flags {
  background: var(--surface-2);
  padding: 4px 14px;
}
.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.variants {
  display: grid;
  gap: 8px;
}
.variant {
  display: grid;
  grid-template-columns: 22px minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) 30px;
  gap: 6px;
  align-items: start;
}
.variant :deep(.ctl) {
  min-height: 42px;
  padding: 0 10px;
  background: var(--surface-2);
  border: 1.5px solid var(--line);
}
.variant :deep(.desc) {
  font-size: var(--fs-11);
}
.def {
  display: grid;
  place-items: center;
  height: 42px;
}
.def input {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
}
.vhead {
  font-size: var(--fs-11);
  font-weight: 600;
  color: var(--ink-3);
  align-items: end;
}
.foot2 {
  display: flex;
  gap: 8px;
}
.rm {
  height: 42px;
  color: var(--ink-3);
}
.rm:disabled {
  opacity: 0.3;
}
.err {
  color: var(--danger);
  font-size: var(--fs-13);
}
.small {
  font-size: var(--fs-13);
  margin-top: 6px;
}
.groups {
  display: grid;
  gap: 6px;
  margin-top: 6px;
}
.grp {
  padding: 4px 4px 6px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1.5px solid transparent;
}
.grp.on {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.ghead {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 6px;
  cursor: pointer;
}
.ghead input {
  accent-color: var(--primary);
  width: 18px;
  height: 18px;
  flex: none;
}
.gn {
  font-weight: 600;
  flex: 1;
}
.gcount {
  font-size: var(--fs-13);
  color: var(--ink-3);
}
.gm {
  list-style: none;
  margin: 0;
  padding: 0 8px 0 36px;
  display: grid;
}
.gopt {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  cursor: pointer;
  font-size: var(--fs-13);
  border-top: 1px solid var(--line);
}
.gopt input {
  accent-color: var(--primary);
  width: 18px;
  height: 18px;
  flex: none;
  margin: 0;
}
.gopt.off {
  opacity: 0.45;
}
.oname {
  flex: 1;
  color: var(--ink-2);
}
.oprice {
  color: var(--ink-3);
  white-space: nowrap;
}
@media (max-width: 520px) {
  .variant {
    grid-template-columns: 22px minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1.1fr) 30px;
    gap: 4px;
  }
  .variant > :nth-child(5) {
    display: none;
  }
}
</style>
