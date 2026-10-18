<script setup lang="ts">
import { Check, Heart, Leaf, Sparkles } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { clientApi } from '@/shared/api/client'
import type { ModifierGroupRead, ProductRead } from '@/shared/api/types'
import ProductArt from '@/shared/components/ProductArt.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import UiSkeleton from '@/shared/components/UiSkeleton.vue'
import UiStepper from '@/shared/components/UiStepper.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { tg } from '@/shared/telegram'
import { money } from '@/shared/utils/format'
import { useCart } from '../stores/cart'
import { useMenu } from '../stores/menu'
import { useSession } from '../stores/session'

const menu = useMenu()
const cart = useCart()
const session = useSession()

const product = ref<ProductRead | null>(null)
const loading = ref(false)
const variantId = ref<number | null>(null)
const picked = ref<Record<number, number[]>>({}) // groupId -> modifierIds
const qty = ref(1)
const fav = ref(false)
const showNutrition = ref(false)

const open = computed(() => menu.openedProductId !== null)

watch(
  () => menu.openedProductId,
  async (id) => {
    if (!id || !session.locationId) return
    loading.value = true
    product.value = null
    qty.value = 1
    showNutrition.value = false
    try {
      const p = await menu.product(session.locationId, id, true)
      product.value = p
      fav.value = p.is_favorite
      const v = p.variants.find((x) => x.is_default && x.is_available) ?? p.variants.find((x) => x.is_available) ?? p.variants[0]
      variantId.value = v?.id ?? null
      picked.value = Object.fromEntries(
        p.modifier_groups.map((g) => [g.id, g.modifiers.filter((m) => m.is_default && m.is_available).map((m) => m.id)]),
      )
    } catch (e) {
      toastError(e)
      menu.close()
    } finally {
      loading.value = false
    }
  },
)

const variant = computed(() => product.value?.variants.find((v) => v.id === variantId.value) ?? null)
const allMods = computed(() => product.value?.modifier_groups.flatMap((g) => g.modifiers) ?? [])
const pickedIds = computed(() => Object.values(picked.value).flat())
const unitPrice = computed(
  () => (variant.value?.price ?? 0) + pickedIds.value.reduce((a, id) => a + (allMods.value.find((m) => m.id === id)?.price_delta ?? 0), 0),
)
const missingRequired = computed(() =>
  (product.value?.modifier_groups ?? []).find((g) => (picked.value[g.id]?.length ?? 0) < g.min_select),
)
const canAdd = computed(() => product.value?.is_available && variant.value?.is_available && !missingRequired.value)

function toggle(g: ModifierGroupRead, id: number) {
  tg.haptic.select()
  const cur = picked.value[g.id] ?? []
  if (g.max_select === 1) {
    // радио; в необязательной группе повторный тап снимает выбор
    picked.value[g.id] = cur.includes(id) && g.min_select === 0 ? [] : [id]
    return
  }
  if (cur.includes(id)) picked.value[g.id] = cur.filter((x) => x !== id)
  else if (cur.length < g.max_select) picked.value[g.id] = [...cur, id]
  else {
    tg.haptic.warning()
    toast(`Можно выбрать не больше ${g.max_select}`)
  }
}

function groupHint(g: ModifierGroupRead) {
  if (g.min_select > 0) return 'обязательно'
  if (g.max_select > 1) return `до ${g.max_select}`
  return 'по желанию'
}

function add() {
  const p = product.value
  const v = variant.value
  if (!p || !v || !canAdd.value) return
  cart.add({
    product_id: p.id, variant_id: v.id, modifier_ids: [...pickedIds.value], quantity: qty.value,
    name: p.name, slug: p.slug, image_url: p.image_url, variant_name: v.name,
    // бесплатный выбор по умолчанию («Обычное» молоко) в корзине не показываем
    modifier_names: pickedIds.value
      .map((id) => allMods.value.find((m) => m.id === id)!)
      .filter((m) => !(m.is_default && m.price_delta === 0))
      .map((m) => m.name),
    unit_price: unitPrice.value, counts_for_loyalty: p.counts_for_loyalty,
  })
  tg.haptic.success()
  toast(`${p.name} в корзине`, 'ok', 1800)
  menu.close()
}

async function toggleFav() {
  const p = product.value
  if (!p) return
  tg.haptic.tap()
  try {
    if (fav.value) {
      const list = await clientApi.favorites()
      const f = list.find((x) => x.product.id === p.id)
      if (f) await clientApi.removeFavorite(f.id)
      fav.value = false
    } else {
      await clientApi.addFavorite({ product_id: p.id, variant_id: variantId.value, modifier_ids: pickedIds.value })
      fav.value = true
      toast('Сохранили сборку в избранное', 'ok')
    }
    if (session.locationId) menu.invalidateProduct(session.locationId, p.id)
  } catch (e) {
    toastError(e)
  }
}
</script>

<template>
  <UiSheet :open="open" :padded="false" :title="product?.name" @close="menu.close()">
    <template #header><span /></template>

    <div v-if="loading || !product" class="pad">
      <UiSkeleton h="220px" r="20px" />
      <div style="height: 16px" />
      <UiSkeleton w="60%" h="26px" />
      <div style="height: 10px" />
      <UiSkeleton h="14px" />
      <div style="height: 6px" />
      <UiSkeleton w="80%" h="14px" />
    </div>

    <div v-else class="content">
      <div class="hero">
        <ProductArt :slug="product.slug" :image-url="product.image_url" :size="232" :tile="false" />
        <button class="fav" :class="{ on: fav }" :aria-pressed="fav" aria-label="В избранное" @click="toggleFav">
          <Heart :size="20" :fill="fav ? 'currentColor' : 'none'" />
        </button>
      </div>

      <div class="pad">
        <div class="tags">
          <span v-if="product.tags.includes('new')" class="tag new"><Sparkles :size="13" />Новинка</span>
          <span v-if="product.tags.includes('hit')" class="tag hit">Берут чаще всего</span>
          <span v-if="product.tags.includes('vegan')" class="tag vegan"><Leaf :size="13" />Без животных продуктов</span>
          <span v-if="product.counts_for_loyalty" class="tag stamp">+1 штамп</span>
        </div>
        <h2 class="name">{{ product.name }}</h2>
        <p v-if="product.description" class="desc">{{ product.description }}</p>

        <p v-if="!product.is_available" class="unavail">Сейчас этого нет на выбранной точке. Загляните позже или выберите другую кофейню.</p>

        <section v-if="product.variants.length > 1" class="group">
          <h3 class="gtitle">Размер</h3>
          <div class="sizes" role="radiogroup" aria-label="Размер">
            <button
              v-for="v in product.variants"
              :key="v.id"
              class="size"
              role="radio"
              :aria-checked="variantId === v.id"
              :class="{ on: variantId === v.id }"
              :disabled="!v.is_available"
              @click="(variantId = v.id), tg.haptic.select()"
            >
              <span class="sname num">{{ v.name }}</span>
              <span v-if="v.volume_ml" class="sml">{{ v.volume_ml }} мл</span>
              <span class="sprice">{{ money(v.price) }}</span>
            </button>
          </div>
        </section>

        <section v-for="g in product.modifier_groups" :key="g.id" class="group">
          <h3 class="gtitle">{{ g.name }} <span class="ghint">{{ groupHint(g) }}</span></h3>
          <div class="opts" :role="g.max_select === 1 ? 'radiogroup' : 'group'" :aria-label="g.name">
            <button
              v-for="m in g.modifiers"
              :key="m.id"
              class="opt"
              :class="{ on: picked[g.id]?.includes(m.id) }"
              :role="g.max_select === 1 ? 'radio' : 'checkbox'"
              :aria-checked="!!picked[g.id]?.includes(m.id)"
              :disabled="!m.is_available"
              @click="toggle(g, m.id)"
            >
              <span class="mark" :class="g.max_select === 1 ? 'radio' : 'box'"><Check v-if="picked[g.id]?.includes(m.id)" :size="13" :stroke-width="3" /></span>
              <span class="oname">{{ m.name }}</span>
              <span class="delta">{{ !m.is_available ? 'нет' : m.price_delta ? `+${money(m.price_delta)}` : '' }}</span>
            </button>
          </div>
        </section>

        <section v-if="variant?.calories != null" class="group">
          <button class="nut-toggle" :aria-expanded="showNutrition" @click="showNutrition = !showNutrition">
            Пищевая ценность {{ variant.name }}
          </button>
          <dl v-if="showNutrition" class="nut">
            <div><dt>Ккал</dt><dd class="num">{{ variant.calories }}</dd></div>
            <div><dt>Белки</dt><dd class="num">{{ variant.proteins }} г</dd></div>
            <div><dt>Жиры</dt><dd class="num">{{ variant.fats }} г</dd></div>
            <div><dt>Углеводы</dt><dd class="num">{{ variant.carbs }} г</dd></div>
          </dl>
        </section>
      </div>
    </div>

    <template v-if="product" #footer>
      <div class="foot">
        <UiStepper v-model="qty" />
        <UiButton size="lg" block :disabled="!canAdd" @click="add">
          <template v-if="missingRequired">Выберите: {{ missingRequired.name.toLowerCase() }}</template>
          <template v-else-if="!product.is_available">Нет в наличии</template>
          <template v-else>
            Добавить
            <span class="num">{{ money(unitPrice * qty) }}</span>
          </template>
        </UiButton>
      </div>
    </template>
  </UiSheet>
</template>

<style scoped>
.pad {
  padding: 0 20px 12px;
}
.hero {
  position: relative;
  display: grid;
  place-items: center;
  padding: 6px 0 14px;
}
.fav {
  position: absolute;
  top: 4px;
  right: 18px;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--ink-2);
}
.fav.on {
  color: var(--stamp);
  background: var(--stamp-soft);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 9px;
  border-radius: var(--r-pill);
  font-size: var(--fs-13);
  font-weight: 600;
  background: var(--surface-2);
  color: var(--ink-2);
}
.tag.new {
  background: var(--crema-soft);
  color: var(--crema-ink);
}
.tag.hit {
  background: var(--primary-soft);
  color: var(--primary);
}
.tag.stamp {
  background: var(--stamp-soft);
  color: var(--stamp);
}
.name {
  font-size: var(--fs-24);
}
.desc {
  margin-top: 8px;
  color: var(--ink-2);
  max-width: 46ch;
}
.unavail {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: var(--r-ctl);
  background: var(--warn-soft);
  color: var(--warn);
  font-weight: 500;
}
.group {
  margin-top: 22px;
}
.gtitle {
  font-family: var(--font-body);
  font-size: var(--fs-15);
  font-weight: 700;
  margin-bottom: 10px;
}
.ghint {
  font-weight: 500;
  color: var(--ink-3);
  font-size: var(--fs-13);
  margin-left: 4px;
}
.sizes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
  gap: 8px;
}
.size {
  display: grid;
  justify-items: start;
  gap: 2px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 2px solid transparent;
  text-align: left;
  transition:
    border-color 0.15s,
    background-color 0.15s;
}
.size.on {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.size:disabled {
  opacity: 0.4;
}
.sname {
  font-size: var(--fs-17);
  font-weight: 600;
}
.sml {
  font-size: var(--fs-13);
  color: var(--ink-3);
}
.sprice {
  font-weight: 600;
  margin-top: 4px;
}
.opts {
  display: grid;
  border-radius: 16px;
  background: var(--surface-2);
  overflow: hidden;
}
.opt {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 0 14px;
  text-align: left;
  font-weight: 500;
}
.opt + .opt {
  border-top: 1px solid var(--line);
}
.opt:disabled {
  opacity: 0.45;
}
.mark {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 2px solid var(--ink-3);
  color: var(--on-primary, #fff);
  transition:
    background-color 0.15s,
    border-color 0.15s;
}
.mark.radio {
  border-radius: 50%;
}
.mark.box {
  border-radius: 7px;
}
.opt.on .mark {
  background: var(--primary);
  border-color: var(--primary);
}
.oname {
  flex: 1;
}
.delta {
  color: var(--ink-3);
  font-size: var(--fs-13);
  white-space: nowrap;
}
.nut-toggle {
  color: var(--ink-2);
  font-weight: 600;
  font-size: var(--fs-13);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.nut {
  margin: 12px 0 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.nut div {
  padding: 10px;
  border-radius: 12px;
  background: var(--surface-2);
}
.nut dt {
  font-size: var(--fs-11);
  color: var(--ink-3);
}
.nut dd {
  margin: 2px 0 0;
  font-size: var(--fs-15);
}
.foot {
  display: flex;
  gap: 12px;
  align-items: center;
}
.foot .btn {
  flex: 1;
  justify-content: space-between;
}
</style>
