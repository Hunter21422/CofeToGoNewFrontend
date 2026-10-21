<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiEmpty from '@/shared/components/UiEmpty.vue'
import UiSkeleton from '@/shared/components/UiSkeleton.vue'
import ProductRow from '../components/ProductRow.vue'
import { useMenu } from '../stores/menu'
import { useSession } from '../stores/session'

defineOptions({ name: 'MenuView' })

const menu = useMenu()
const session = useSession()
const route = useRoute()
const q = ref('')
const activeSlug = ref<string | null>(null)
const tabsEl = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let jumping = false

const filtered = computed(() => {
  const cats = menu.menu?.categories ?? []
  const s = q.value.trim().toLowerCase()
  if (!s) return cats
  return cats
    .map((c) => ({ ...c, products: c.products.filter((p) => `${p.name} ${p.description ?? ''}`.toLowerCase().includes(s)) }))
    .filter((c) => c.products.length)
})

function jump(slug: string, smooth = true) {
  const el = document.getElementById(`cat-${slug}`)
  if (!el) return
  jumping = true
  activeSlug.value = slug
  const y = el.getBoundingClientRect().top + window.scrollY - 112
  window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' })
  setTimeout(() => (jumping = false), 600)
}

function observe() {
  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      if (jumping) return
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (vis[0]) activeSlug.value = (vis[0].target as HTMLElement).dataset.slug ?? null
    },
    { rootMargin: '-120px 0px -60% 0px' },
  )
  document.querySelectorAll<HTMLElement>('[data-slug]').forEach((el) => observer!.observe(el))
}

// активная вкладка всегда видна в полосе категорий
watch(activeSlug, async (s) => {
  await nextTick()
  const btn = tabsEl.value?.querySelector<HTMLElement>(`[data-tab="${s}"]`)
  btn?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
})

watch(filtered, async () => {
  await nextTick()
  observe()
  if (!activeSlug.value) activeSlug.value = filtered.value[0]?.slug ?? null
})

async function applyQuery() {
  const cat = route.query.cat as string | undefined
  await nextTick()
  if (cat) setTimeout(() => jump(cat, false), 30)
}

onMounted(async () => {
  if (session.locationId) await menu.load(session.locationId)
  await nextTick()
  observe()
  applyQuery()
})
onActivated(applyQuery)
watch(() => route.query.cat, applyQuery)
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <main class="screen">
    <h1 class="page-title">Меню</h1>

    <label class="search">
      <Search :size="18" />
      <input v-model="q" type="search" placeholder="Поиск по меню" aria-label="Поиск по меню" />
      <button v-if="q" type="button" aria-label="Очистить" @click="q = ''"><X :size="18" /></button>
    </label>

    <nav v-if="filtered.length" ref="tabsEl" class="tabs scroll-x" aria-label="Категории">
      <button
        v-for="c in filtered"
        :key="c.id"
        :data-tab="c.slug"
        class="ctab"
        :class="{ on: activeSlug === c.slug }"
        :aria-current="activeSlug === c.slug || undefined"
        @click="jump(c.slug)"
      >
        {{ c.name }}
      </button>
    </nav>

    <div v-if="menu.loading && !menu.menu" class="sk">
      <div v-for="i in 5" :key="i" class="sk-row">
        <UiSkeleton w="88px" h="88px" r="14px" />
        <div style="flex: 1; display: grid; gap: 8px">
          <UiSkeleton w="50%" h="16px" />
          <UiSkeleton h="12px" />
          <UiSkeleton w="30%" h="14px" />
        </div>
      </div>
    </div>

    <UiEmpty v-else-if="!filtered.length && !q.trim()" title="Меню скоро появится" text="Мы как раз раскладываем всё по полочкам. Загляните чуть позже." />
    <UiEmpty v-else-if="!filtered.length" title="Ничего не нашли" :text="`По запросу «${q}» в меню пусто. Попробуйте по-другому.`" />

    <section v-for="c in filtered" :id="`cat-${c.slug}`" :key="c.id" :data-slug="c.slug" class="cat">
      <h2 class="cat-title">{{ c.name }}</h2>
      <div class="list">
        <ProductRow v-for="p in c.products" :key="p.id" :product="p" :description="p.description" :category="`${c.slug} ${c.name}`" @open="menu.open(p.id)" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.search {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  padding: 0 14px;
  border-radius: 14px;
  background: var(--surface);
  color: var(--ink-3);
}
.search input {
  flex: 1;
  border: 0;
  outline: none;
  background: none;
  color: var(--ink);
  min-width: 0;
}
.search input::-webkit-search-cancel-button {
  display: none;
}
.tabs {
  position: sticky;
  top: 0;
  z-index: 20;
  gap: 6px;
  margin: 12px calc(var(--gutter) * -1) 0;
  padding: 10px var(--gutter);
  background: color-mix(in oklab, var(--paper) 92%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.ctab {
  flex: none;
  height: 36px;
  padding: 0 14px;
  border-radius: var(--r-pill);
  font-weight: 600;
  font-size: var(--fs-13);
  color: var(--ink-2);
  background: var(--surface);
  transition:
    background-color 0.18s,
    color 0.18s;
}
.ctab.on {
  background: var(--ink);
  color: var(--paper);
}
.cat {
  margin-top: 20px;
}
.cat-title {
  font-size: var(--fs-20);
  margin-bottom: 4px;
}
.list :deep(.prow + .prow) {
  border-top: 1px solid var(--line);
}
.sk {
  margin-top: 20px;
  display: grid;
  gap: 16px;
}
.sk-row {
  display: flex;
  gap: 14px;
}
</style>
