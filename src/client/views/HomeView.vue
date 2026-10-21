<script setup lang="ts">
import { ChevronDown, ChevronRight, QrCode } from 'lucide-vue-next'
import { computed, onActivated, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { BannerRead } from '@/shared/api/types'
import ProductArt from '@/shared/components/ProductArt.vue'
import StampCard from '@/shared/components/StampCard.vue'
import UiEmpty from '@/shared/components/UiEmpty.vue'
import UiSkeleton from '@/shared/components/UiSkeleton.vue'
import { usePolling } from '@/shared/composables/usePolling'
import { initials, money, STATUS_LABEL, when } from '@/shared/utils/format'
import LocationSheet from '../components/LocationSheet.vue'
import { useMenu } from '../stores/menu'
import { useSession } from '../stores/session'

defineOptions({ name: 'HomeView' })

const session = useSession()
const menu = useMenu()
const router = useRouter()
const locOpen = ref(false)

const greeting = computed(() => {
  const h = new Date().getHours()
  const part = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'
  return `${part}, ${session.user?.first_name ?? 'гость'}`
})
const active = computed(() => session.activeOrders[0] ?? null)

// профиль и активный заказ освежаем, пока открыта главная
usePolling(() => session.refreshProfile(), 8000, false)
onActivated(() => session.refreshProfile())

function openBanner(b: BannerRead) {
  if (b.link_type === 'product' && b.link_value) menu.open(Number(b.link_value))
  else if (b.link_type === 'category' && b.link_value) {
    const c = menu.menu?.categories.find((x) => x.id === Number(b.link_value))
    router.push({ path: '/menu', query: c ? { cat: c.slug } : {} })
  } else if (b.link_type === 'url' && b.link_value) window.open(b.link_value, '_blank')
}
</script>

<template>
  <main class="screen">
    <header class="top">
      <div class="who">
        <p class="hello">{{ greeting }}</p>
        <button class="loc" @click="locOpen = true">
          <span class="dot" :class="{ open: session.location?.is_open_now && session.location?.accepts_orders }" />
          <span class="loc-name">{{ session.location?.name ?? 'Выберите кофейню' }}</span>
          <ChevronDown :size="18" />
        </button>
      </div>
      <RouterLink to="/profile" class="avatar" aria-label="Профиль">
        <img v-if="session.user?.photo_url" :src="session.user.photo_url" alt="" />
        <span v-else>{{ initials(session.user?.first_name ?? '', session.user?.last_name) }}</span>
      </RouterLink>
    </header>

    <RouterLink v-if="active" :to="`/orders/${active.id}`" class="active" :class="active.status">
      <span class="anum num">{{ active.display_number }}</span>
      <span class="amain">
        <span class="astatus">{{ STATUS_LABEL[active.status] }}<span v-if="active.status === 'ready'"> — заберите на стойке</span></span>
        <span class="asub">{{ active.location.name }} · {{ when(active.created_at) }}</span>
      </span>
      <ChevronRight :size="20" />
    </RouterLink>

    <RouterLink v-if="session.loyalty" to="/card" class="card-link" aria-label="Открыть карту гостя">
      <StampCard :stamps="session.loyalty.stamps" :per-gift="session.loyalty.stamps_per_gift" :gifts="session.loyalty.gifts_available">
        <span class="show-code"><QrCode :size="16" /> Показать код бариста</span>
      </StampCard>
    </RouterLink>

    <section v-if="menu.menu?.banners.length" class="section">
      <div class="banners scroll-x">
        <button v-for="b in menu.menu.banners" :key="b.id" class="banner" @click="openBanner(b)">
          <span class="btext">
            <span class="btitle">{{ b.title }}</span>
            <span v-if="b.subtitle" class="bsub">{{ b.subtitle }}</span>
          </span>
          <ProductArt :slug="b.image_url.replace('art:', '')" :image-url="b.image_url" :size="104" :tile="false" />
        </button>
      </div>
    </section>

    <section v-if="(menu.loading && !menu.menu) || menu.hits.length" class="section">
      <div class="section-head">
        <h2 class="section-title">Сейчас берут</h2>
        <RouterLink to="/menu" class="link">Всё меню</RouterLink>
      </div>
      <div v-if="menu.loading && !menu.menu" class="tiles scroll-x">
        <UiSkeleton v-for="i in 3" :key="i" w="148px" h="196px" r="20px" />
      </div>
      <div v-else class="tiles scroll-x">
        <button v-for="p in menu.hits" :key="p.id" class="tile" :class="{ off: !p.is_available }" @click="menu.open(p.id)">
          <ProductArt :slug="p.slug" :image-url="p.image_url" :category="menu.categoryOf(p.id)" :size="124" />
          <span class="tname">{{ p.name }}</span>
          <span class="tprice num">от {{ money(p.min_price) }}</span>
        </button>
      </div>
    </section>

    <section v-if="menu.menu?.categories.length" class="section">
      <h2 class="section-title cats-title">Меню</h2>
      <div class="cats">
        <RouterLink v-for="c in menu.menu.categories" :key="c.id" :to="{ path: '/menu', query: { cat: c.slug } }" class="cat">
          <span class="cicon" aria-hidden="true">{{ c.icon }}</span>
          <span class="cname">{{ c.name }}</span>
          <span class="ccount">{{ c.products.length }}</span>
        </RouterLink>
      </div>
    </section>

    <UiEmpty v-else-if="menu.menu" title="Меню скоро появится" text="Мы как раз раскладываем всё по полочкам. Загляните чуть позже." />

    <LocationSheet :open="locOpen" @close="locOpen = false" />
  </main>
</template>

<style scoped>
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0 18px;
}
.who {
  min-width: 0;
}
.hello {
  font-size: var(--fs-13);
  color: var(--ink-2);
}
.loc {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--fs-17);
  padding: 2px 0;
}
.loc-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
}
.dot.open {
  background: var(--ok);
  box-shadow: 0 0 0 4px var(--ok-soft);
}
.avatar {
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 700;
  font-size: var(--fs-13);
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.active {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  margin-bottom: 14px;
  border-radius: var(--r-card);
  background: var(--surface);
  box-shadow: var(--shadow-lift);
}
.active.ready {
  background: var(--ok-soft);
}
.anum {
  font-size: var(--fs-24);
  font-weight: 700;
}
.amain {
  flex: 1;
  min-width: 0;
  display: grid;
}
.astatus {
  font-weight: 600;
}
.asub {
  font-size: var(--fs-13);
  color: var(--ink-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-link {
  display: block;
}
.show-code {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  height: 36px;
  padding: 0 14px;
  border-radius: var(--r-pill);
  background: rgb(255 255 255 / 0.12);
  font-weight: 600;
  font-size: var(--fs-13);
}

.banners {
  gap: 10px;
  margin: 0 calc(var(--gutter) * -1);
  padding: 0 var(--gutter);
  scroll-snap-type: x mandatory;
}
.banner {
  flex: none;
  width: min(84%, 340px);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 8px 16px 18px;
  border-radius: var(--r-card);
  background: var(--crema-soft);
  text-align: left;
  scroll-snap-align: start;
}
.banner:nth-child(3n + 2) {
  background: var(--primary-soft);
}
.banner:nth-child(3n + 3) {
  background: var(--surface-2);
}
.btext {
  flex: 1;
  display: grid;
  gap: 4px;
}
.btitle {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--fs-15);
  line-height: 1.2;
}
.bsub {
  font-size: var(--fs-13);
  color: var(--ink-2);
}

.tiles {
  gap: 10px;
  margin: 0 calc(var(--gutter) * -1);
  padding: 0 var(--gutter) 4px;
}
.tile {
  flex: none;
  width: 148px;
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: var(--r-card);
  background: var(--surface);
  text-align: left;
}
.tile.off {
  opacity: 0.5;
}
.tname {
  font-weight: 600;
  font-size: var(--fs-13);
  line-height: 1.3;
  min-height: 2.6em;
}
.tprice {
  font-size: var(--fs-13);
  color: var(--ink-2);
}

.cats-title {
  margin-bottom: 12px;
}
.cats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.cat {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  background: var(--surface);
}
.cicon {
  font-size: 22px;
}
.cname {
  flex: 1;
  font-weight: 600;
}
.ccount {
  font-size: var(--fs-13);
  color: var(--ink-3);
}
</style>
