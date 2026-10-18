<script setup lang="ts">
import { ShoppingBag } from 'lucide-vue-next'
import { money, plural } from '@/shared/utils/format'
import { useCart } from '../stores/cart'

const cart = useCart()
</script>

<template>
  <Transition name="bar">
    <RouterLink v-if="cart.count" to="/cart" class="bar">
      <span class="bag"><ShoppingBag :size="20" /><span class="n num">{{ cart.count }}</span></span>
      <span class="txt">{{ cart.count }} {{ plural(cart.count, 'позиция', 'позиции', 'позиций') }}</span>
      <span class="sum num">{{ money(cart.localTotal) }}</span>
    </RouterLink>
  </Transition>
</template>

<style scoped>
.bar {
  position: fixed;
  z-index: 39;
  left: var(--gutter);
  right: var(--gutter);
  bottom: calc(var(--tabbar-h) + var(--safe-bottom) + 10px);
  max-width: 528px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 18px 0 10px;
  border-radius: 18px;
  background: var(--primary);
  color: var(--on-primary);
  box-shadow: 0 14px 30px -14px rgb(23 60 45 / 0.7);
  font-weight: 600;
}
.bag {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgb(255 255 255 / 0.14);
}
.n {
  position: absolute;
  top: -5px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--crema);
  color: #3b2a0c;
  font-size: 10px;
  display: grid;
  place-items: center;
}
.txt {
  flex: 1;
}
.sum {
  font-size: var(--fs-17);
}
.bar-enter-active,
.bar-leave-active {
  transition:
    transform 0.32s var(--ease),
    opacity 0.2s;
}
.bar-enter-from,
.bar-leave-to {
  transform: translateY(24px);
  opacity: 0;
}
</style>
