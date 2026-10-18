<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/shared/components/UiButton.vue'
import UiToasts from '@/shared/components/UiToasts.vue'
import { tg } from '@/shared/telegram'
import CartBar from './components/CartBar.vue'
import ProductSheet from './components/ProductSheet.vue'
import TabBar from './components/TabBar.vue'
import WebLogin from './components/WebLogin.vue'
import { useMenu } from './stores/menu'
import { useSession } from './stores/session'

const session = useSession()
const menu = useMenu()
const route = useRoute()
const router = useRouter()

const isTab = computed(() => !!route.meta.tab)

onMounted(() => session.boot())

// Меню грузим под выбранную точку
watch(
  () => session.locationId,
  (id) => id && session.ready && menu.load(id),
)
watch(
  () => session.ready,
  (r) => r && session.locationId && menu.load(session.locationId),
)

// шторка товара не должна переживать переход на другой экран
watch(() => route.fullPath, () => menu.close())

// Нативная кнопка «назад» Telegram на внутренних экранах
let off = () => {}
watch(
  () => route.meta.back,
  (back) => {
    off()
    off = back ? tg.backButton(() => (history.length > 1 ? router.back() : router.push('/'))) : tg.backButton(null)
  },
  { immediate: true },
)
</script>

<template>
  <WebLogin v-if="session.needLogin" @done="session.boot()" />

  <div v-else-if="session.error" class="boot">
    <h1 class="boot-title">Не получилось открыть приложение</h1>
    <p class="muted">{{ session.error }}</p>
    <UiButton @click="session.boot()">Попробовать снова</UiButton>
  </div>

  <div v-else-if="!session.ready" class="boot" aria-busy="true">
    <svg class="bean" viewBox="0 0 48 48" aria-hidden="true">
      <ellipse cx="24" cy="24" rx="12" ry="17" transform="rotate(-28 24 24)" fill="currentColor" />
      <path d="M19 10c7 6 0 18 9 26" stroke="var(--paper)" stroke-width="3" fill="none" stroke-linecap="round" />
    </svg>
  </div>

  <template v-else>
    <RouterView v-slot="{ Component }">
      <KeepAlive include="HomeView,MenuView">
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
    <CartBar v-if="isTab" />
    <TabBar v-if="isTab" />
    <ProductSheet />
  </template>

  <UiToasts />
</template>

<style scoped>
.boot {
  min-height: 100dvh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 14px;
  padding: 24px;
  text-align: center;
}
.boot-title {
  font-size: var(--fs-20);
}
.bean {
  width: 48px;
  color: var(--primary);
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  50% {
    opacity: 0.4;
    transform: rotate(14deg) scale(0.92);
  }
}
</style>
