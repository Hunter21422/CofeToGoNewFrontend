<script setup lang="ts">
import { ChevronRight, Receipt } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { clientApi } from '@/shared/api/client'
import { ACTIVE_STATUSES, type OrderShort } from '@/shared/api/types'
import UiBadge from '@/shared/components/UiBadge.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiEmpty from '@/shared/components/UiEmpty.vue'
import UiSkeleton from '@/shared/components/UiSkeleton.vue'
import { money, plural, STATUS_LABEL, STATUS_TONE, when } from '@/shared/utils/format'

const router = useRouter()
const items = ref<OrderShort[]>([])
const total = ref(0)
const loading = ref(true)
const more = ref(false)

async function load(offset = 0) {
  const page = await clientApi.orders({ limit: 20, offset })
  items.value = offset ? [...items.value, ...page.items] : page.items
  total.value = page.total
}
onMounted(async () => {
  await load()
  loading.value = false
})
async function loadMore() {
  more.value = true
  await load(items.value.length)
  more.value = false
}
const active = computed(() => items.value.filter((o) => ACTIVE_STATUSES.includes(o.status)))
const past = computed(() => items.value.filter((o) => !ACTIVE_STATUSES.includes(o.status)))
</script>

<template>
  <main class="screen no-tabs">
    <h1 class="page-title">Мои заказы</h1>

    <div v-if="loading" class="panel"><UiSkeleton v-for="i in 5" :key="i" h="48px" style="margin: 12px 0" /></div>

    <UiEmpty v-else-if="!items.length" title="Заказов ещё не было" text="Оформите первый — бариста начнёт готовить, как только вы оплатите.">
      <template #icon><Receipt :size="28" /></template>
      <UiButton @click="router.push('/menu')">Выбрать кофе</UiButton>
    </UiEmpty>

    <template v-else>
      <section v-if="active.length">
        <h2 class="section-title gtitle">Сейчас</h2>
        <div class="panel">
          <RouterLink v-for="o in active" :key="o.id" :to="`/orders/${o.id}`" class="row">
            <span class="onum num">{{ o.display_number }}</span>
            <span class="row-main">
              <span class="row-title">{{ o.location.name }}</span>
              <span class="row-sub">{{ when(o.created_at) }}</span>
            </span>
            <UiBadge :tone="STATUS_TONE[o.status]" dot>{{ STATUS_LABEL[o.status] }}</UiBadge>
          </RouterLink>
        </div>
      </section>

      <section :class="{ section: active.length }">
        <h2 v-if="active.length" class="section-title gtitle">Раньше</h2>
        <div class="panel">
          <RouterLink v-for="o in past" :key="o.id" :to="`/orders/${o.id}`" class="row">
            <span class="onum num faint">{{ o.display_number }}</span>
            <span class="row-main">
              <span class="row-title">{{ money(o.total) }}, {{ o.items_count }} {{ plural(o.items_count, 'позиция', 'позиции', 'позиций') }}</span>
              <span class="row-sub">{{ when(o.created_at) }}, {{ o.location.name }}</span>
            </span>
            <UiBadge v-if="o.status !== 'completed'" :tone="STATUS_TONE[o.status]">{{ STATUS_LABEL[o.status] }}</UiBadge>
            <ChevronRight v-else :size="18" class="faint" />
          </RouterLink>
        </div>
        <UiButton v-if="items.length < total" variant="ghost" block :loading="more" class="more" @click="loadMore">Показать ещё</UiButton>
      </section>
    </template>
  </main>
</template>

<style scoped>
.gtitle {
  margin-bottom: 10px;
}
.onum {
  width: 52px;
  font-weight: 600;
  font-size: var(--fs-15);
}
.more {
  margin-top: 8px;
}
</style>
