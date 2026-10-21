<script setup lang="ts">
import {
  Ban, ChartColumn, LayoutGrid, ListOrdered, Megaphone, Menu as MenuIcon, MessageSquare, Milk, Percent, ScanLine,
  Lock, LogOut, Settings, Store, UserCog, Users, UtensilsCrossed, Volume2, VolumeX,
} from 'lucide-vue-next'
import { computed, ref, watch, type Component } from 'vue'
import { useRoute } from 'vue-router'
import UiButton from '@/shared/components/UiButton.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import UiToasts from '@/shared/components/UiToasts.vue'
import { initials, ROLE_LABEL } from '@/shared/utils/format'
import LoginScreen from './components/LoginScreen.vue'
import PinScreen from './components/PinScreen.vue'
import { useIdleLock } from './composables/useIdleLock'
import { adminRoutes } from './router'
import { useAdmin } from './stores/admin'

const ICONS: Record<string, Component> = {
  LayoutGrid, ScanLine, ListOrdered, Ban, UtensilsCrossed, Milk, Users, Percent, Megaphone, ChartColumn, MessageSquare, UserCog, Store, Settings,
}
const admin = useAdmin()
const route = useRoute()
const moreOpen = ref(false)
const BUILD = __BUILD__

const nav = computed(() => adminRoutes.filter((r) => r.meta?.nav && (!r.meta.role || admin.can(r.meta.role))))
const mainNav = computed(() => nav.value.filter((r) => r.meta?.nav === 'main'))
const moreNav = computed(() => nav.value.filter((r) => r.meta?.nav === 'more'))
watch(() => route.fullPath, () => (moreOpen.value = false))


useIdleLock(() => admin.me?.idle_lock_minutes ?? 15, () => admin.lock())
async function logout() {
  if (confirm('Выйти из панели на этом устройстве?')) await admin.logout()
}
</script>

<template>
  <div v-if="admin.stage === 'denied'" class="boot">
    <h1>Нет доступа к панели</h1>
    <p class="muted">{{ admin.error }}. Если вы в команде кофейни, попросите владельца добавить вас по Telegram ID.</p>
    <UiButton @click="admin.boot()">Попробовать снова</UiButton>
  </div>

  <LoginScreen v-else-if="admin.stage === 'login'" />
  <PinScreen v-else-if="admin.stage === 'pin-setup'" key="setup" mode="setup" />
  <PinScreen v-else-if="admin.stage === 'pin'" key="verify" mode="verify" />

  <div v-else-if="admin.ready" class="shell">
    <aside class="side">
      <div class="brand">
        <img src="/favicon.svg" alt="" width="34" height="34" />
        <span>
          <span class="bname">Кофе с тобой</span>
          <span class="brole">{{ ROLE_LABEL[admin.role] }}</span>
        </span>
      </div>

      <label class="locsel">
        <span class="visually-hidden">Точка</span>
        <select class="select" :value="admin.locationId ?? ''" :disabled="admin.locations.length < 2" @change="admin.setLocation(Number(($event.target as HTMLSelectElement).value))">
          <option v-for="l in admin.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
        </select>
      </label>

      <nav class="nav" aria-label="Разделы">
        <RouterLink v-for="r in mainNav" :key="r.path" :to="r.path" class="nl">
          <component :is="ICONS[r.meta!.icon!]" :size="19" />{{ r.meta!.title }}
        </RouterLink>
        <div class="sep" />
        <RouterLink v-for="r in moreNav" :key="r.path" :to="r.path" class="nl">
          <component :is="ICONS[r.meta!.icon!]" :size="19" />{{ r.meta!.title }}
        </RouterLink>
      </nav>

      <div class="side-foot">
        <button class="nl" :aria-pressed="admin.sound" @click="admin.toggleSound()">
          <component :is="admin.sound ? Volume2 : VolumeX" :size="19" />
          {{ admin.sound ? 'Звук новых заказов' : 'Звук выключен' }}
        </button>
        <p class="build">Версия от {{ BUILD }}</p>
        <div v-if="admin.me" class="me">
          <span class="ava">{{ initials(admin.me.user.first_name, admin.me.user.last_name) }}</span>
          <span class="mname">{{ admin.me.user.first_name }} {{ admin.me.user.last_name }}</span>
          <button class="ic" title="Заблокировать (попросит PIN)" aria-label="Заблокировать панель" @click="admin.lock()"><Lock :size="17" /></button>
          <button class="ic" title="Выйти" aria-label="Выйти из панели" @click="logout"><LogOut :size="17" /></button>
        </div>
      </div>
    </aside>

    <div class="main">
      <RouterView :key="admin.locationId ?? 0" />
    </div>

    <!-- мобильная навигация -->
    <nav class="bottom" aria-label="Разделы">
      <RouterLink v-for="r in mainNav" :key="r.path" :to="r.path" class="bl">
        <component :is="ICONS[r.meta!.icon!]" :size="22" /><span>{{ r.meta!.title }}</span>
      </RouterLink>
      <button class="bl" :class="{ 'router-link-active': moreNav.some((r) => r.path === route.path) }" @click="moreOpen = true">
        <MenuIcon :size="22" /><span>Ещё</span>
      </button>
    </nav>

    <UiSheet :open="moreOpen" title="Разделы" @close="moreOpen = false">
      <label class="locsel m">
        <span class="label">Точка</span>
        <select class="select" :value="admin.locationId ?? ''" @change="admin.setLocation(Number(($event.target as HTMLSelectElement).value))">
          <option v-for="l in admin.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
        </select>
      </label>
      <div class="more-grid">
        <RouterLink v-for="r in moreNav" :key="r.path" :to="r.path" class="mg">
          <component :is="ICONS[r.meta!.icon!]" :size="22" />{{ r.meta!.title }}
        </RouterLink>
      </div>
      <div class="acc">
        <button class="nl" @click="admin.lock()"><Lock :size="19" />Заблокировать</button>
        <button class="nl" @click="logout"><LogOut :size="19" />Выйти</button>
      </div>
      <button class="nl snd" @click="admin.toggleSound()">
        <component :is="admin.sound ? Volume2 : VolumeX" :size="19" />{{ admin.sound ? 'Звук новых заказов включён' : 'Звук выключен' }}
      </button>
      <p class="build">Версия от {{ BUILD }}</p>
    </UiSheet>
  </div>

  <UiToasts />
</template>

<style scoped>
.build {
  margin: 12px 0 0;
  text-align: center;
  font-size: var(--fs-11);
  color: var(--ink-3);
}
.boot {
  min-height: 100dvh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  max-width: 460px;
  margin: 0 auto;
}
.boot h1 {
  font-size: var(--fs-20);
}
.shell {
  display: grid;
  grid-template-columns: 248px 1fr;
  min-height: 100dvh;
}
.side {
  position: sticky;
  top: 0;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 14px;
  border-right: 1px solid var(--line);
  background: var(--surface);
  overflow-y: auto;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px;
}
.brand > span {
  display: grid;
}
.bname {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--fs-17);
}
.brole {
  font-size: var(--fs-11);
  color: var(--ink-3);
  font-weight: 600;
}
.locsel .select {
  width: 100%;
  height: 40px;
  font-weight: 600;
}
.locsel.m {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}
.nav {
  display: grid;
  gap: 2px;
}
.nl {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 10px;
  border-radius: 10px;
  color: var(--ink-2);
  font-weight: 500;
  width: 100%;
  text-align: left;
}
.nl:hover {
  background: var(--surface-2);
  color: var(--ink);
}
.nl.router-link-exact-active {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 600;
}
.sep {
  height: 1px;
  background: var(--line);
  margin: 8px 6px;
}
.side-foot {
  margin-top: auto;
  display: grid;
  gap: 10px;
}
.me {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
}
.ava {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary);
  color: var(--on-primary);
  font-size: var(--fs-11);
  font-weight: 700;
}
.mname {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  font-size: var(--fs-13);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ic {
  padding: 6px;
  border-radius: 8px;
  color: var(--ink-3);
}
.ic:hover {
  background: var(--surface-2);
  color: var(--ink);
}
.acc {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 12px;
}
.acc .nl {
  background: var(--surface-2);
  justify-content: center;
}
.main {
  min-width: 0;
}
.bottom {
  display: none;
}
.more-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.mg {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 14px 6px;
  border-radius: 14px;
  background: var(--surface-2);
  font-size: var(--fs-13);
  font-weight: 600;
  text-align: center;
  color: var(--ink-2);
}
.mg.router-link-exact-active {
  background: var(--primary-soft);
  color: var(--primary);
}
.snd {
  margin-top: 12px;
}

@media (max-width: 899px) {
  .shell {
    display: block;
  }
  .side {
    display: none;
  }
  .bottom {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    height: calc(64px + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    background: color-mix(in oklab, var(--surface) 90%, transparent);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-top: 1px solid var(--line);
  }
  .bl {
    display: grid;
    place-items: center;
    align-content: center;
    gap: 3px;
    font-size: var(--fs-11);
    font-weight: 600;
    color: var(--ink-3);
  }
  .bl.router-link-exact-active,
  .bl.router-link-active {
    color: var(--primary);
  }
}
</style>
