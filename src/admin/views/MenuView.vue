<script setup lang="ts">
import { Pencil, Plus } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { CategoryAdminRead, ModifierGroupAdminRead, ProductAdminRead } from '@/shared/api/types'
import ProductArt from '@/shared/components/ProductArt.vue'
import UiBadge from '@/shared/components/UiBadge.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import UiSwitch from '@/shared/components/UiSwitch.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { money } from '@/shared/utils/format'
import ProductEditor from '../components/ProductEditor.vue'

const categories = ref<CategoryAdminRead[]>([])
const products = ref<ProductAdminRead[]>([])
const groups = ref<ModifierGroupAdminRead[]>([])
const catId = ref<number | null>(null)
const q = ref('')
const editing = ref<ProductAdminRead | null>(null)
const editorOpen = ref(false)

const catOpen = ref(false)
const catEdit = ref<CategoryAdminRead | null>(null)
const catForm = ref({ name: '', slug: '', icon: '', available_from: '', available_to: '' })

async function load() {
  const [c, p, g] = await Promise.all([adminApi.categories(), adminApi.products({ limit: 500 }), adminApi.modifierGroups()])
  categories.value = c
  products.value = p.items
  groups.value = g
}
onMounted(load)

const shown = computed(() =>
  products.value.filter((p) => (!catId.value || p.category_id === catId.value) && (!q.value || p.name.toLowerCase().includes(q.value.toLowerCase()))),
)
const countIn = (id: number) => products.value.filter((p) => p.category_id === id).length

function edit(p: ProductAdminRead | null) {
  editing.value = p
  editorOpen.value = true
}
function onSaved(p: ProductAdminRead) {
  const i = products.value.findIndex((x) => x.id === p.id)
  if (i >= 0) products.value[i] = p
  else products.value.push(p)
  editorOpen.value = false
}
function onDeleted(id: number) {
  products.value = products.value.filter((p) => p.id !== id)
  editorOpen.value = false
}
async function toggleActive(p: ProductAdminRead, v: boolean) {
  try {
    const r = await adminApi.updateProduct(p.id, { is_active: v })
    Object.assign(p, r)
    toast(v ? `${p.name} снова в меню` : `${p.name} скрыт из меню`, 'ok')
  } catch (e) {
    toastError(e)
  }
}

function openCat(c: CategoryAdminRead | null) {
  catEdit.value = c
  catForm.value = { name: c?.name ?? '', slug: c?.slug ?? '', icon: c?.icon ?? '', available_from: c?.available_from ?? '', available_to: c?.available_to ?? '' }
  catOpen.value = true
}
async function saveCat() {
  const d = { ...catForm.value, available_from: catForm.value.available_from || null, available_to: catForm.value.available_to || null, icon: catForm.value.icon || null }
  if (!d.name.trim() || !/^[a-z0-9-]+$/.test(d.slug)) return toast('Нужны название и slug латиницей', 'error')
  try {
    if (catEdit.value) Object.assign(catEdit.value, await adminApi.updateCategory(catEdit.value.id, d))
    else categories.value.push(await adminApi.createCategory(d))
    catOpen.value = false
    toast('Категория сохранена', 'ok')
  } catch (e) {
    toastError(e)
  }
}
async function toggleCat(c: CategoryAdminRead) {
  Object.assign(c, await adminApi.updateCategory(c.id, { is_active: !c.is_active }))
}
async function deleteCat() {
  if (!catEdit.value || !confirm(`Удалить категорию «${catEdit.value.name}»?`)) return
  try {
    await adminApi.deleteCategory(catEdit.value.id)
    categories.value = categories.value.filter((c) => c.id !== catEdit.value!.id)
    catOpen.value = false
  } catch (e) {
    toastError(e)
  }
}
</script>

<template>
  <main class="page">
    <header class="page-head">
      <h1>Меню</h1>
      <UiButton @click="edit(null)"><Plus :size="18" />Товар</UiButton>
    </header>

    <div class="layout">
      <aside class="cats card">
        <button class="cat" :class="{ on: catId === null }" @click="catId = null">
          <span class="cn">Все товары</span><span class="cc num">{{ products.length }}</span>
        </button>
        <div v-for="c in categories" :key="c.id" class="cat-row">
          <button class="cat" :class="{ on: catId === c.id, off: !c.is_active }" @click="catId = c.id">
            <span class="ci">{{ c.icon }}</span>
            <span class="cn">{{ c.name }}</span>
            <span class="cc num">{{ countIn(c.id) }}</span>
          </button>
          <button class="ced" :aria-label="`Изменить ${c.name}`" @click="openCat(c)"><Pencil :size="14" /></button>
        </div>
        <UiButton variant="ghost" size="sm" block @click="openCat(null)"><Plus :size="16" />Категория</UiButton>
      </aside>

      <section class="list">
        <div class="toolbar">
          <div class="q"><UiField v-model="q" placeholder="Найти товар" /></div>
        </div>
        <div class="table-wrap">
          <table class="t">
            <thead>
              <tr><th /><th>Товар</th><th>Размеры</th><th>Штамп</th><th>В меню</th><th /></tr>
            </thead>
            <tbody>
              <tr v-for="p in shown" :key="p.id" class="click" :class="{ dim: !p.is_active }" @click="edit(p)">
                <td class="art"><ProductArt :slug="p.slug" :image-url="p.image_url" :size="44" /></td>
                <td>
                  <span class="strong">{{ p.name }}</span>
                  <span class="badges">
                    <UiBadge v-if="p.tags.includes('new')" tone="crema">новинка</UiBadge>
                    <UiBadge v-if="p.tags.includes('hit')" tone="primary">хит</UiBadge>
                  </span>
                  <span class="sub">{{ categories.find((c) => c.id === p.category_id)?.name }}</span>
                </td>
                <td class="sizes">
                  <span v-for="v in p.variants" :key="v.id" class="sz"><b>{{ v.name }}</b> {{ money(v.price) }}</span>
                </td>
                <td>
                  <UiBadge v-if="p.counts_for_loyalty" tone="danger">+1</UiBadge>
                  <span v-else class="faint">—</span>
                </td>
                <td @click.stop><UiSwitch :model-value="p.is_active" @update:model-value="(v: boolean) => toggleActive(p, v)" /></td>
                <td><Pencil :size="16" class="faint" /></td>
              </tr>
              <tr v-if="!shown.length"><td colspan="6" class="empty-line">В этой категории пока нет товаров</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <ProductEditor :open="editorOpen" :product="editing" :categories="categories" :groups="groups" :default-category-id="catId" @close="editorOpen = false" @saved="onSaved" @deleted="onDeleted" />

    <UiSheet :open="catOpen" :title="catEdit ? catEdit.name : 'Новая категория'" @close="catOpen = false">
      <div class="form">
        <div class="form-row">
          <UiField v-model="catForm.icon" label="Иконка" placeholder="☕" :maxlength="4" />
          <UiField v-model="catForm.name" label="Название" placeholder="Сезонное" />
        </div>
        <UiField v-model="catForm.slug" label="Slug" placeholder="seasonal" mono />
        <div class="form-row">
          <UiField v-model="catForm.available_from" type="time" label="Доступна с" hint="Пусто — весь день" />
          <UiField v-model="catForm.available_to" type="time" label="до" />
        </div>
        <UiSwitch v-if="catEdit" :model-value="catEdit.is_active" label="Показывать в меню" @update:model-value="toggleCat(catEdit!)" />
      </div>
      <template #footer>
        <div class="foot2">
          <UiButton v-if="catEdit" variant="danger" @click="deleteCat">Удалить</UiButton>
          <UiButton block @click="saveCat">Сохранить</UiButton>
        </div>
      </template>
    </UiSheet>
  </main>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  align-items: start;
}
.cats {
  display: grid;
  gap: 2px;
  padding: 8px;
  position: sticky;
  top: 16px;
}
.cat-row {
  display: flex;
  align-items: center;
}
.cat {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 10px;
  border-radius: 10px;
  text-align: left;
  font-weight: 500;
  color: var(--ink-2);
}
.cat.on {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 600;
}
.cat.off .cn {
  text-decoration: line-through;
  opacity: 0.6;
}
.cn {
  flex: 1;
}
.cc {
  font-size: var(--fs-11);
  color: var(--ink-3);
}
.ced {
  padding: 8px;
  color: var(--ink-3);
}
.q {
  flex: 1;
  max-width: 360px;
}
.q :deep(.ctl) {
  background: var(--surface);
  min-height: 40px;
}
.art {
  width: 60px;
}
.badges {
  display: inline-flex;
  gap: 4px;
  margin-left: 6px;
  vertical-align: 1px;
}
.badges :deep(.badge) {
  height: 20px;
  font-size: var(--fs-11);
  padding: 0 7px;
}
.sub {
  display: block;
  font-size: var(--fs-11);
  color: var(--ink-3);
}
.sizes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  color: var(--ink-2);
}
.sz b {
  font-family: var(--font-display);
  font-size: var(--fs-11);
  color: var(--ink);
}
tr.dim td {
  opacity: 0.55;
}
tr.dim td:nth-child(5) {
  opacity: 1;
}
.foot2 {
  display: flex;
  gap: 8px;
}
@media (max-width: 899px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .cats {
    position: static;
    display: flex;
    overflow-x: auto;
    padding: 6px;
  }
  .cat-row {
    flex: none;
  }
  .cat {
    flex: none;
    white-space: nowrap;
  }
  .cats > .btn {
    flex: none;
    width: auto;
  }
  .sizes,
  .t th:nth-child(3) {
    display: none;
  }
}
</style>
