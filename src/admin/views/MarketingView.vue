<script setup lang="ts">
import { Plus, Send, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { BannerAdminRead, BannerLinkType, BroadcastRead, BroadcastSegment, CategoryAdminRead, ProductAdminRead } from '@/shared/api/types'
import ProductArt from '@/shared/components/ProductArt.vue'
import GuestQrPanel from '../components/GuestQrPanel.vue'
import UiBadge from '@/shared/components/UiBadge.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSegmented from '@/shared/components/UiSegmented.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import UiSwitch from '@/shared/components/UiSwitch.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { when } from '@/shared/utils/format'

const tab = ref<'banners' | 'broadcasts' | 'qr'>('broadcasts')
const banners = ref<BannerAdminRead[]>([])
const broadcasts = ref<BroadcastRead[]>([])
const products = ref<ProductAdminRead[]>([])
const categories = ref<CategoryAdminRead[]>([])

onMounted(async () => {
  const [b, br, p, c] = await Promise.all([adminApi.banners(), adminApi.broadcasts(), adminApi.products({ limit: 500 }), adminApi.categories()])
  banners.value = b
  broadcasts.value = br
  products.value = p.items
  categories.value = c
})

// ---------- баннеры ----------
const bOpen = ref(false)
const bf = reactive({ title: '', subtitle: '', image_url: '', link_type: 'product' as BannerLinkType, link_value: '' })
function newBanner() {
  Object.assign(bf, { title: '', subtitle: '', image_url: '', link_type: 'product', link_value: '' })
  bOpen.value = true
}
async function saveBanner() {
  if (!bf.title.trim()) return toast('Нужен заголовок', 'error')
  const p = bf.link_type === 'product' ? products.value.find((x) => String(x.id) === bf.link_value) : null
  try {
    const b = await adminApi.createBanner({
      title: bf.title.trim(), subtitle: bf.subtitle || null, image_url: bf.image_url || (p ? `art:${p.slug}` : 'art:latte'),
      link_type: bf.link_type, link_value: bf.link_value || null, location_ids: null, starts_at: null, ends_at: null, sort_order: banners.value.length + 1,
    })
    banners.value.push(b)
    bOpen.value = false
    toast('Баннер появился на главной у гостей', 'ok')
  } catch (e) {
    toastError(e)
  }
}
async function toggleBanner(b: BannerAdminRead, v: boolean) {
  Object.assign(b, await adminApi.updateBanner(b.id, { is_active: v }))
}
async function removeBanner(b: BannerAdminRead) {
  if (!confirm(`Удалить баннер «${b.title}»?`)) return
  await adminApi.deleteBanner(b.id)
  banners.value = banners.value.filter((x) => x.id !== b.id)
}

// ---------- рассылки ----------
const rOpen = ref(false)
const rf = reactive({ title: '', text: '', button_text: '', scheduled_at: '' })
const seg = reactive<BroadcastSegment>({ only_marketing_consent: true, inactive_days: null, stamps_gte: null, has_gift: null, birthday_month: null })
const segKind = ref<'all' | 'inactive' | 'close' | 'birthday'>('all')
const audience = ref<number | null>(null)
const sending = ref(false)

watch(segKind, (k) => {
  Object.assign(seg, { inactive_days: k === 'inactive' ? 30 : null, stamps_gte: k === 'close' ? 4 : null, birthday_month: k === 'birthday' ? new Date().getMonth() + 1 : null })
})
let t: ReturnType<typeof setTimeout>
watch(
  seg,
  () => {
    clearTimeout(t)
    t = setTimeout(async () => (audience.value = (await adminApi.segmentPreview({ ...seg })).count), 200)
  },
  { immediate: true, deep: true },
)
function newBroadcast() {
  Object.assign(rf, { title: '', text: '', button_text: 'Открыть меню', scheduled_at: '' })
  segKind.value = 'all'
  rOpen.value = true
}
async function createBroadcast(sendNow: boolean) {
  if (!rf.title.trim() || !rf.text.trim()) return toast('Нужны название и текст', 'error')
  sending.value = true
  try {
    let b = await adminApi.createBroadcast({
      title: rf.title.trim(), text: rf.text.trim(), button_text: rf.button_text.trim() || null, button_url: rf.button_text.trim() ? `${window.location.origin}/` : null, segment: { ...seg },
      scheduled_at: !sendNow && rf.scheduled_at ? new Date(rf.scheduled_at).toISOString() : null,
    })
    if (sendNow) b = await adminApi.sendBroadcast(b.id)
    broadcasts.value.unshift(b)
    rOpen.value = false
    toast(sendNow ? 'Рассылка запущена — уйдёт в течение минуты' : 'Рассылка сохранена', 'ok')
  } catch (e) {
    toastError(e)
  } finally {
    sending.value = false
  }
}
async function sendNow(b: BroadcastRead) {
  if (!confirm(`Отправить «${b.title}» сейчас?`)) return
  Object.assign(b, await adminApi.sendBroadcast(b.id))
  toast('Рассылка запущена — уйдёт в течение минуты', 'ok')
}
const STATUS: Record<BroadcastRead['status'], { t: string; tone: 'neutral' | 'info' | 'warn' | 'ok' | 'danger' }> = {
  draft: { t: 'Черновик', tone: 'neutral' },
  scheduled: { t: 'Запланирована', tone: 'info' },
  sending: { t: 'Отправляется', tone: 'warn' },
  done: { t: 'Отправлена', tone: 'ok' },
  cancelled: { t: 'Отменена', tone: 'danger' },
}
const segLabel = (s: BroadcastSegment) =>
  s.inactive_days ? `Не заходили ${s.inactive_days} дней` : s.stamps_gte ? `От ${s.stamps_gte} штампов` : s.birthday_month ? 'Именинники месяца' : 'Все, кто согласился на рассылку'
const preview = computed(() => rf.text || 'Текст сообщения появится здесь')
</script>

<template>
  <main class="page">
    <header class="page-head">
      <h1>Баннеры и рассылки</h1>
      <UiButton v-if="tab === 'broadcasts'" @click="newBroadcast"><Plus :size="18" />Рассылка</UiButton>
      <UiButton v-else-if="tab === 'banners'" @click="newBanner"><Plus :size="18" />Баннер</UiButton>
    </header>

    <div class="toolbar">
      <UiSegmented
        v-model="tab"
        size="sm"
        :options="[
          { value: 'broadcasts', label: 'Рассылки в Telegram' },
          { value: 'banners', label: 'Баннеры на главной' },
          { value: 'qr', label: 'QR для гостей' },
        ]"
      />
    </div>

    <GuestQrPanel v-if="tab === 'qr'" />

    <div v-if="tab === 'broadcasts'" class="table-wrap">
      <table class="t">
        <thead><tr><th>Рассылка</th><th>Кому</th><th>Статус</th><th class="r">Доставлено</th><th /></tr></thead>
        <tbody>
          <tr v-for="b in broadcasts" :key="b.id">
            <td><span class="strong">{{ b.title }}</span><span class="sub">{{ b.text }}</span></td>
            <td class="faint">{{ segLabel(b.segment) }}</td>
            <td>
              <UiBadge :tone="STATUS[b.status].tone" dot>{{ STATUS[b.status].t }}</UiBadge>
              <span v-if="b.scheduled_at && b.status === 'scheduled'" class="sub">{{ when(b.scheduled_at) }}</span>
            </td>
            <td class="r num">
              <template v-if="b.status === 'done'">{{ b.sent_count }}<span class="faint"> / {{ b.total_count }}</span></template>
              <span v-else class="faint">—</span>
            </td>
            <td class="r"><UiButton v-if="['draft', 'scheduled'].includes(b.status)" size="sm" variant="secondary" @click="sendNow(b)"><Send :size="14" />Отправить</UiButton></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="tab === 'banners'" class="banners">
      <article v-for="b in banners" :key="b.id" class="card banner" :class="{ off: !b.is_active }">
        <ProductArt :slug="b.image_url.replace('art:', '')" :image-url="b.image_url" :size="72" />
        <div class="bw">
          <span class="strong">{{ b.title }}</span>
          <span class="sub">{{ b.subtitle }}</span>
          <span class="sub">Ведёт: {{ b.link_type === 'product' ? products.find((p) => String(p.id) === b.link_value)?.name : b.link_type === 'category' ? categories.find((c) => String(c.id) === b.link_value)?.name : b.link_value ?? 'никуда' }}</span>
        </div>
        <UiSwitch :model-value="b.is_active" @update:model-value="(v: boolean) => toggleBanner(b, v)" />
        <button class="rm" aria-label="Удалить баннер" @click="removeBanner(b)"><Trash2 :size="16" /></button>
      </article>
    </div>

    <!-- новая рассылка -->
    <UiSheet :open="rOpen" title="Новая рассылка" @close="rOpen = false">
      <div class="form">
        <UiField v-model="rf.title" label="Название (видите только вы)" placeholder="Запуск тыквенного латте" />
        <UiField v-model="rf.text" label="Текст" multiline :rows="4" :maxlength="1024" placeholder="Тыквенный латте вернулся…" />
        <UiField v-model="rf.button_text" label="Кнопка" hint="Откроет приложение кофейни" />

        <div>
          <span class="label">Кому</span>
          <div class="segs">
            <button class="chip-filter" :class="{ on: segKind === 'all' }" @click="segKind = 'all'">Всем</button>
            <button class="chip-filter" :class="{ on: segKind === 'inactive' }" @click="segKind = 'inactive'">Давно не заходили</button>
            <button class="chip-filter" :class="{ on: segKind === 'close' }" @click="segKind = 'close'">Близки к подарку</button>
            <button class="chip-filter" :class="{ on: segKind === 'birthday' }" @click="segKind = 'birthday'">Именинники месяца</button>
          </div>
          <p class="aud">Получат примерно <b class="num">{{ audience ?? '…' }}</b> гостей. Тем, кто не дал согласие на рассылки, не отправим.</p>
        </div>

        <div class="tgprev" aria-label="Как увидит гость">
          <div class="bubble">
            <p>{{ preview }}</p>
            <span v-if="rf.button_text" class="tgbtn">{{ rf.button_text }}</span>
          </div>
        </div>

        <UiField v-model="rf.scheduled_at" type="datetime-local" label="Отправить позже" hint="Пусто — сохраним черновиком" />
      </div>
      <template #footer>
        <div class="foot2">
          <UiButton variant="secondary" :loading="sending" @click="createBroadcast(false)">{{ rf.scheduled_at ? 'Запланировать' : 'В черновики' }}</UiButton>
          <UiButton block :loading="sending" @click="createBroadcast(true)"><Send :size="16" />Отправить сейчас</UiButton>
        </div>
      </template>
    </UiSheet>

    <!-- новый баннер -->
    <UiSheet :open="bOpen" title="Новый баннер" @close="bOpen = false">
      <div class="form">
        <UiField v-model="bf.title" label="Заголовок" placeholder="Тыквенный латте вернулся" />
        <UiField v-model="bf.subtitle" label="Подзаголовок" placeholder="Только до конца ноября" />
        <UiSegmented
          v-model="bf.link_type"
          size="sm"
          :options="[
            { value: 'product', label: 'Товар' },
            { value: 'category', label: 'Категория' },
            { value: 'url', label: 'Ссылка' },
            { value: 'none', label: 'Никуда' },
          ]"
        />
        <select v-if="bf.link_type === 'product'" v-model="bf.link_value" class="select">
          <option value="" disabled>Какой товар открыть</option>
          <option v-for="p in products" :key="p.id" :value="String(p.id)">{{ p.name }}</option>
        </select>
        <select v-else-if="bf.link_type === 'category'" v-model="bf.link_value" class="select">
          <option value="" disabled>Какую категорию</option>
          <option v-for="c in categories" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
        </select>
        <UiField v-else-if="bf.link_type === 'url'" v-model="bf.link_value" placeholder="https://" />
        <UiField v-model="bf.image_url" label="Картинка (URL)" hint="Пусто — возьмём иллюстрацию товара" />
      </div>
      <template #footer><UiButton block size="lg" @click="saveBanner">Опубликовать баннер</UiButton></template>
    </UiSheet>
  </main>
</template>

<style scoped>
.sub {
  display: block;
  font-size: var(--fs-11);
  color: var(--ink-3);
  max-width: 48ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.banners {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 12px;
}
.banner {
  display: flex;
  align-items: center;
  gap: 14px;
}
.banner.off {
  opacity: 0.55;
}
.bw {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
}
.rm {
  color: var(--ink-3);
  padding: 6px;
}
.segs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.segs .chip-filter {
  background: var(--surface-2);
}
.aud {
  margin-top: 10px;
  font-size: var(--fs-13);
  color: var(--ink-2);
}
.tgprev {
  padding: 18px;
  border-radius: 16px;
  background: #b9c9a8 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='8' cy='8' r='2' fill='%23ffffff' fill-opacity='.25'/%3E%3Ccircle cx='28' cy='24' r='1.5' fill='%23ffffff' fill-opacity='.2'/%3E%3C/svg%3E");
}
:root[data-theme='dark'] .tgprev {
  background-color: #1f2a22;
}
.bubble {
  max-width: 320px;
  background: #fff;
  color: #111;
  border-radius: 14px 14px 14px 4px;
  overflow: hidden;
}
.bubble p {
  padding: 10px 12px;
  white-space: pre-wrap;
  font-size: var(--fs-13);
}
.tgbtn {
  display: block;
  padding: 9px;
  text-align: center;
  font-weight: 600;
  font-size: var(--fs-13);
  color: #2a7ab0;
  border-top: 1px solid #eee;
}
.foot2 {
  display: flex;
  gap: 8px;
}
</style>
