<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { DashboardOut, StatsGroupBy } from '@/shared/api/types'
import UiSegmented from '@/shared/components/UiSegmented.vue'
import UiSkeleton from '@/shared/components/UiSkeleton.vue'
import { money, PAYMENT_LABEL, rubles, todayIso } from '@/shared/utils/format'
import BarList from '../components/BarList.vue'
import HeatMap from '../components/HeatMap.vue'
import KpiTile from '../components/KpiTile.vue'
import LineChart from '../components/LineChart.vue'
import { useAdmin } from '../stores/admin'

const admin = useAdmin()
const period = ref<'today' | '7d' | '30d'>('7d')
const scope = ref<'location' | 'all'>(admin.role === 'owner' ? 'all' : 'location')
const data = ref<DashboardOut | null>(null)
const loading = ref(true)
const showTable = ref(false)

const range = computed(() => {
  const p = period.value
  const groupBy: StatsGroupBy = p === 'today' ? 'hour' : 'day'
  return { date_from: todayIso(p === 'today' ? 0 : p === '7d' ? -6 : -29), date_to: todayIso(), group_by: groupBy }
})
async function load() {
  loading.value = true
  try {
    data.value = await adminApi.dashboard({ ...range.value, location_id: scope.value === 'location' ? admin.locationId ?? undefined : undefined })
  } finally {
    loading.value = false
  }
}
watch([period, scope], load)
onMounted(load)

const k = computed(() => data.value?.kpi)
const p = computed(() => data.value?.kpi.prev_period)
const series = computed(() => (data.value?.series ?? []).map((s) => ({ x: s.ts, y: s.revenue })))
const fmtX = (iso: string) => {
  const d = new Date(iso)
  return range.value.group_by === 'hour' ? `${d.getHours()}:00` : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
const fmtTip = (iso: string) => {
  const d = new Date(iso)
  return range.value.group_by === 'hour' ? `${d.getHours()}:00–${d.getHours() + 1}:00` : d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
}
const fmtY = (v: number) => (v >= 100_000_00 ? `${(v / 100_000_00).toFixed(1)} млн` : v >= 1000_00 ? `${Math.round(v / 1000_00)} тыс` : rubles(v))
const top = computed(() => (data.value?.top_products ?? []).map((t) => ({ label: t.name, value: t.quantity, tip: `${t.quantity} шт, ${money(t.revenue)}` })))
const pays = computed(() =>
  Object.entries(data.value?.payment_methods ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([m, n]) => ({ label: PAYMENT_LABEL[m as keyof typeof PAYMENT_LABEL] ?? m, value: n })),
)
const mins = (s: number) => `${Math.floor(s / 60)} мин ${String(s % 60).padStart(2, '0')} с`
</script>

<template>
  <main class="page">
    <header class="page-head"><h1>Аналитика</h1></header>

    <div class="toolbar">
      <UiSegmented
        v-model="period"
        size="sm"
        :options="[
          { value: 'today', label: 'Сегодня' },
          { value: '7d', label: '7 дней' },
          { value: '30d', label: '30 дней' },
        ]"
      />
      <UiSegmented
        v-if="admin.role === 'owner'"
        v-model="scope"
        size="sm"
        :options="[
          { value: 'all', label: 'Все точки' },
          { value: 'location', label: admin.location?.name ?? 'Эта точка' },
        ]"
      />
    </div>

    <div v-if="loading && !data" class="kpis"><UiSkeleton v-for="i in 8" :key="i" h="96px" r="20px" /></div>

    <template v-else-if="k">
      <div class="kpis" :class="{ busy: loading }">
        <KpiTile label="Выручка" :value="money(k.revenue)" :current="k.revenue" :previous="p?.revenue" />
        <KpiTile label="Заказов" :value="String(k.orders_count)" :current="k.orders_count" :previous="p?.orders_count" />
        <KpiTile label="Средний чек" :value="money(k.avg_check)" :current="k.avg_check" :previous="p?.avg_check" />
        <KpiTile label="Новых гостей" :value="String(k.new_customers)" :current="k.new_customers" :previous="p?.new_customers" />
        <KpiTile label="Вернулись" :value="String(k.returning_customers)" :current="k.returning_customers" :previous="p?.returning_customers" />
        <KpiTile label="Штампов поставлено" :value="String(k.stamps_issued)" :current="k.stamps_issued" :previous="p?.stamps_issued" />
        <KpiTile label="Подарков выдано" :value="String(k.gifts_redeemed)" :current="k.gifts_redeemed" :previous="p?.gifts_redeemed" />
        <KpiTile label="Готовим в среднем" :value="mins(k.avg_prep_seconds)" :current="k.avg_prep_seconds" :previous="p?.avg_prep_seconds" lower-is-better />
      </div>

      <section class="card chart">
        <div class="ch-head">
          <h2 class="card-title">Выручка по {{ range.group_by === 'hour' ? 'часам' : 'дням' }}</h2>
          <button class="link-btn" @click="showTable = !showTable">{{ showTable ? 'График' : 'Таблица' }}</button>
        </div>
        <LineChart v-if="!showTable" :points="series" :format-y="fmtY" :format-x="fmtX" :format-tip="fmtTip" />
        <div v-else class="tbl">
          <table class="t">
            <thead><tr><th>{{ range.group_by === 'hour' ? 'Час' : 'День' }}</th><th class="r">Заказов</th><th class="r">Выручка</th></tr></thead>
            <tbody>
              <tr v-for="s in data!.series" :key="s.ts"><td>{{ fmtTip(s.ts) }}</td><td class="r num">{{ s.orders }}</td><td class="r num">{{ money(s.revenue) }}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="grid-2">
        <section class="card">
          <h2 class="card-title">Что берут чаще всего, шт</h2>
          <BarList :rows="top" :format="(v) => String(v)" />
        </section>
        <section class="card">
          <h2 class="card-title">Когда больше всего заказов</h2>
          <HeatMap :cells="data!.heatmap" />
        </section>
        <section class="card">
          <h2 class="card-title">Способы оплаты, заказов</h2>
          <BarList :rows="pays" :format="(v) => String(v)" />
        </section>
        <section class="card small-kpis">
          <h2 class="card-title">Качество</h2>
          <dl>
            <div><dt>Отмены и отказы</dt><dd class="num">{{ (k.cancel_rate * 100).toFixed(1) }}%</dd></div>
            <div><dt>Средняя оценка</dt><dd class="num">{{ k.avg_rating ? k.avg_rating.toFixed(2) : '—' }} из 5</dd></div>
          </dl>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
  transition: opacity 0.2s;
}
.kpis.busy {
  opacity: 0.6;
}
.chart {
  margin-bottom: 14px;
}
.ch-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.link-btn {
  color: var(--primary);
  font-weight: 600;
  font-size: var(--fs-13);
}
.tbl {
  max-height: 320px;
  overflow: auto;
}
.small-kpis dl {
  margin: 0;
  display: grid;
  gap: 10px;
}
.small-kpis div {
  display: flex;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--surface-2);
}
.small-kpis dt {
  color: var(--ink-2);
}
.small-kpis dd {
  margin: 0;
  font-weight: 700;
}
</style>
