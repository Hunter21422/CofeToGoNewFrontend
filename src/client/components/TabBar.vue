<script setup lang="ts">
import { Coffee, House, Ticket, User } from 'lucide-vue-next'
import { computed } from 'vue'
import { tg } from '@/shared/telegram'
import { useSession } from '../stores/session'

const session = useSession()
const gifts = computed(() => session.loyalty?.gifts_available ?? 0)

const tabs = [
  { to: '/', label: 'Главная', icon: House },
  { to: '/menu', label: 'Меню', icon: Coffee },
  { to: '/card', label: 'Карта', icon: Ticket },
  { to: '/profile', label: 'Профиль', icon: User },
]
</script>

<template>
  <nav class="tabbar" aria-label="Разделы">
    <RouterLink v-for="t in tabs" :key="t.to" :to="t.to" class="tab" @click="tg.haptic.select()">
      <span class="ico">
        <component :is="t.icon" :size="23" :stroke-width="1.9" />
        <span v-if="t.to === '/card' && gifts > 0" class="dot" :aria-label="`Подарков: ${gifts}`" />
      </span>
      <span class="lbl">{{ t.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  height: calc(var(--tabbar-h) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  background: color-mix(in oklab, var(--surface) 88%, transparent);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  border-top: 1px solid var(--line);
}
.tab {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 3px;
  color: var(--ink-3);
  font-size: var(--fs-11);
  font-weight: 600;
}
.tab.router-link-exact-active {
  color: var(--primary);
}
.ico {
  position: relative;
}
.dot {
  position: absolute;
  top: -2px;
  right: -5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--crema);
  border: 2px solid var(--surface);
}
</style>
