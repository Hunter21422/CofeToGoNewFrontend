<script setup lang="ts">
import { Copy, Download, Printer } from 'lucide-vue-next'
import QR from 'qrcode'
import { computed, ref, watch } from 'vue'
import QrCode from '@/shared/components/QrCode.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiSegmented from '@/shared/components/UiSegmented.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import { toast } from '@/shared/composables/useToast'
import { tg } from '@/shared/telegram'
import { botUsername } from '@/shared/utils/format'

const SHOP = import.meta.env.VITE_SHOP_NAME || 'Кофе с тобой'
const target = ref<'site' | 'bot'>('site')
const url = computed(() => (target.value === 'site' ? `${location.origin}/?from=qr` : `https://t.me/${botUsername()}`))
const busy = ref(false)

const INK = '#17231c'
const GREEN = '#1f4d3a'
const PAPER = '#f2f4ef'
const CREMA = '#e2b770'
const MINT = '#cfe0d5'

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = []
  let line = ''
  for (const w of text.split(' ')) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > max && line) {
      out.push(line)
      line = w
    } else line = next
  }
  if (line) out.push(line)
  return out
}

async function poster(): Promise<HTMLCanvasElement> {
  await document.fonts.ready
  const sample = 'Кофе с тобой ЗАКАЗ Наведите abc 123'
  await Promise.all([document.fonts.load('700 80px Unbounded', sample), document.fonts.load('500 40px Onest', sample), document.fonts.load('700 40px Onest', sample)])
  const W = 1240
  const H = 1754
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = GREEN
  ctx.beginPath()
  ctx.roundRect(60, 60, W - 120, 560, 48)
  ctx.fill()

  ctx.fillStyle = CREMA
  ctx.font = '700 34px Onest, sans-serif'
  ctx.fillText(target.value === 'site' ? 'ЗАКАЗ ЗАРАНЕЕ · БЕЗ ОЧЕРЕДИ' : 'ЗАКАЗ В TELEGRAM · БЕЗ ОЧЕРЕДИ', 130, 170)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 92px Unbounded, sans-serif'
  let y = 290
  for (const l of wrap(ctx, SHOP, W - 260)) {
    ctx.fillText(l, 130, y)
    y += 104
  }
  ctx.fillStyle = MINT
  ctx.font = '500 40px Onest, sans-serif'
  for (const l of wrap(ctx, 'Закажите кофе с телефона и заберите, когда будет готово. Штамп за каждый заказ, 6-й — напиток в подарок.', W - 260)) {
    ctx.fillText(l, 130, y + 10)
    y += 54
  }

  const size = 640
  const qx = (W - size) / 2
  const qy = 720
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(qx - 50, qy - 50, size + 100, size + 100, 40)
  ctx.fill()
  const q = document.createElement('canvas')
  await QR.toCanvas(q, url.value, { width: size, margin: 0, errorCorrectionLevel: 'M', color: { dark: INK, light: '#ffffff' } })
  ctx.drawImage(q, qx, qy, size, size)

  ctx.fillStyle = INK
  ctx.textAlign = 'center'
  ctx.font = '700 48px Onest, sans-serif'
  ctx.fillText('Наведите камеру телефона', W / 2, qy + size + 150)
  ctx.fillStyle = '#4f5c55'
  ctx.font = '500 34px Onest, sans-serif'
  ctx.fillText(target.value === 'site' ? 'Откроется сайт — его можно добавить на экран «Домой»' : `Откроется бот @${botUsername()}`, W / 2, qy + size + 205)
  return c
}

const cache = new Map<string, Blob>()
const preview = ref<string | null>(null)
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
const fileName = computed(() => (target.value === 'site' ? 'qr-sait.png' : 'qr-telegram.png'))

async function build(): Promise<Blob> {
  const key = url.value
  const hit = cache.get(key)
  if (hit) return hit
  const c = await poster()
  const blob = await new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('png'))), 'image/png'))
  if (document.fonts.check('700 80px Unbounded', 'Кофе') && document.fonts.check('500 40px Onest', 'Кофе')) cache.set(key, blob)
  return blob
}

watch(url, () => setTimeout(() => build().catch(() => {}), 600), { immediate: true })

function showPreview(blob: Blob) {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = URL.createObjectURL(blob)
}

async function savePoster() {
  const ready = cache.get(url.value)
  if (ready) {
    const file = new File([ready], fileName.value, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'QR для гостей' })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
  }
  busy.value = true
  try {
    const blob = ready ?? (await build())
    if (isIos || tg.inTelegram) return showPreview(blob)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileName.value
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  } catch {
    toast('Не получилось подготовить постер', 'error')
  } finally {
    busy.value = false
  }
}

async function printPoster() {
  const w = tg.inTelegram ? null : window.open('', '_blank')
  busy.value = true
  try {
    const blob = await build()
    if (!w) return showPreview(blob)
    const src = URL.createObjectURL(blob)
    w.document.write(`<!doctype html><title>QR</title><style>@page{size:A5;margin:0}html,body{margin:0}img{width:100%;height:auto;display:block}</style><img src="${src}" onload="setTimeout(()=>print(),300)">`)
    w.document.close()
  } catch {
    w?.close()
    toast('Не получилось подготовить постер', 'error')
  } finally {
    busy.value = false
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(url.value)
    toast('Ссылка скопирована', 'ok')
  } catch {
    toast(url.value)
  }
}
</script>

<template>
  <section class="qp">
    <div class="info">
      <h2>QR для гостей</h2>
      <p class="muted">Распечатайте и поставьте у кассы, на столики, на стаканы. Гость наводит камеру и сразу попадает к вам.</p>
      <UiSegmented
        v-model="target"
        class="tgt"
        size="sm"
        :options="[
          { value: 'site', label: 'Сайт' },
          { value: 'bot', label: 'Бот' },
        ]"
      />
      <p class="hint">
        {{ target === 'site' ? 'Гость с телефона сначала увидит короткую инструкцию, как добавить сайт на экран «Домой», — и дальше пользуется им как приложением.' : 'Откроется бот, из него — меню в Telegram. Подходит тем, у кого есть Telegram.' }}
      </p>
      <button type="button" class="url" @click="copy"><span>{{ url }}</span><Copy :size="15" /></button>
      <div class="btns">
        <UiButton :loading="busy" @click="savePoster"><Download :size="18" />Скачать постер</UiButton>
        <UiButton variant="secondary" :disabled="busy" @click="printPoster"><Printer :size="18" />Распечатать</UiButton>
      </div>
    </div>
    <div class="code">
      <QrCode :value="url" :size="200" />
    </div>

    <UiSheet :open="!!preview" title="Постер готов" @close="preview = null">
      <p class="hint">Нажмите на картинку и удерживайте → «Сохранить в Фото» или «Сохранить изображение». Распечатать удобнее с компьютера.</p>
      <img v-if="preview" :src="preview" alt="Постер с QR-кодом" class="pv" />
    </UiSheet>
  </section>
</template>

<style scoped>
.qp {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  padding: 24px;
  border-radius: var(--r-card);
  background: var(--surface);
}
.info {
  display: grid;
  gap: 12px;
  justify-items: start;
  min-width: 0;
}
h2 {
  font-size: var(--fs-20);
}
.tgt {
  width: 100%;
  max-width: 320px;
}
.hint {
  font-size: var(--fs-13);
  color: var(--ink-2);
  max-width: 520px;
}
.url {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-ctl);
  background: var(--surface-2);
  color: var(--ink);
  font: inherit;
  font-size: var(--fs-13);
  cursor: pointer;
}
.url span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.btns {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.code {
  padding: 18px;
  border-radius: 20px;
  background: #fff;
}
.pv {
  display: block;
  width: 100%;
  height: auto;
  margin-top: 12px;
  border-radius: 12px;
  -webkit-touch-callout: default;
  user-select: auto;
}
@media (max-width: 720px) {
  .qp {
    grid-template-columns: minmax(0, 1fr);
    padding: 18px;
  }
  .url {
    width: 100%;
  }
  .btns > * {
    flex: 1 1 140px;
  }
  .code {
    justify-self: center;
  }
}
</style>
