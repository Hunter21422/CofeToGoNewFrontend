<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import type { ProductShort } from '@/shared/api/types'
import ProductArt from '@/shared/components/ProductArt.vue'
import { money } from '@/shared/utils/format'

defineProps<{ product: ProductShort; description?: string | null; category?: string | null }>()
defineEmits<{ open: [] }>()
</script>

<template>
  <button class="prow" :class="{ off: !product.is_available }" @click="$emit('open')">
    <ProductArt :slug="product.slug" :image-url="product.image_url" :category="category" :size="88" />
    <span class="main">
      <span class="name">
        {{ product.name }}
        <span v-if="product.tags.includes('new')" class="mark new">новинка</span>
      </span>
      <span v-if="description" class="desc">{{ description }}</span>
      <span class="bottom">
        <span class="price num">
          <template v-if="!product.is_available">Нет в наличии</template>
          <template v-else>от {{ money(product.min_price) }}</template>
        </span>
        <span v-if="product.is_available" class="add" aria-hidden="true"><Plus :size="18" /></span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.prow {
  display: flex;
  gap: 14px;
  width: 100%;
  padding: 12px 0;
  text-align: left;
  align-items: stretch;
}
.off {
  opacity: 0.55;
}
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.name {
  font-weight: 600;
  font-size: var(--fs-15);
}
.mark {
  margin-left: 4px;
  font-size: var(--fs-11);
  font-weight: 600;
  padding: 2px 7px;
  border-radius: var(--r-pill);
  vertical-align: 2px;
}
.mark.new {
  background: var(--crema-soft);
  color: var(--crema-ink);
}
.desc {
  font-size: var(--fs-13);
  color: var(--ink-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.bottom {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
}
.price {
  font-size: var(--fs-15);
  font-weight: 500;
}
.add {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary-soft);
  color: var(--primary);
}
</style>
