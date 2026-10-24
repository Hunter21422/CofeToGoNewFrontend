<script setup lang="ts">
import { Copy, Download, Printer } from 'lucide-vue-next'
import QR from 'qrcode'
import { computed, ref } from 'vue'
import QrCode from '@/shared/components/QrCode.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiSegmented from '@/shared/components/UiSegmented.vue'
import { toast } from '@/shared/composables/useToast'
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
  await Promise.all([document.fonts.load('700 80px Unbounded'), document.fonts.load('500 40px Onest'), document.fonts.load('700 40px Onest')])
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
  ctx.font = '700 34px Onest'
  ctx.fillText(target.value === 'site' ? 'ЗАКАЗ ЗАРАНЕЕ · БЕЗ ОЧЕРЕДИ' : 'ЗАКАЗ В TELEGRAM · БЕЗ ОЧЕРЕДИ', 130, 170)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 92px Unbounded'
  let y = 290
  for (const l of wrap(ctx, SHOP, W - 260)) {
    ctx.fillText(l, 130, y)
    y += 104
  }
  ctx.fillStyle = MINT
  ctx.font = '500 40px Onest'
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
  ctx.font = '700 48px Onest'
  ctx.fillText('Наведите камеру телефона', W / 2, qy + size + 150)
  ctx.fillStyle = '#4f5c55'
  ctx.font = '500 34px Onest'
  ctx.fillText(target.value === 'site' ? 'Откроется сайт — его можно добавить на экран «Домой»' : `Откроется бот @${botUsername()}`, W / 2, qy + size + 205)
  return c
}

async function download() {
  busy.value = true
  try {
    const c = await poster()
    const a = document.createElement('a')
    a.href = c.toDataURL('image/png')
    a.download = target.value === 'site' ? 'qr-sait.png' : 'qr-telegram.png'
    a.click()
  } finally {
    busy.value = false
  }
}

async function print() {
  busy.value = true
  try {
    const src = (await poster()).toDataURL('image/png')
    const w = window.open('', '_blank')
    if (!w) return toast('Браузер заблокировал окно печати. Скачайте PNG и распечатайте его', 'error')
    w.document.write(`<!doctype html><title>QR</title><style>@page{size:A5;margin:0}html,body{margin:0}img{width:100%;height:auto;display:block}</style><img src="${src}" onload="setTimeout(()=>print(),200)">`)
    w.document.close()
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
        size="sm"
        :options="[
          { value: 'site', label: 'Сайт' },
          { value: 'bot', label: 'Telegram-бот' },
        ]"
      />
      <p class="hint">
        {{ target === 'site' ? 'Гость с телефона сначала увидит короткую инструкцию, как добавить сайт на экран «Домой», — и дальше пользуется им как приложением.' : 'Откроется бот, из него — меню в Telegram. Подходит тем, у кого есть Telegram.' }}
      </p>
      <button type="button" class="url" @click="copy"><span>{{ url }}</span><Copy :size="15" /></button>
      <div class="btns">
        <UiButton :loading="busy" @click="download"><Download :size="18" />Скачать постер</UiButton>
        <UiButton variant="secondary" :disabled="busy" @click="print"><Printer :size="18" />Распечатать</UiButton>
      </div>
    </div>
    <div class="code">
      <QrCode :value="url" :size="220" />
    </div>
  </section>
</template>

<style scoped>
.qp {
  display: grid;
  grid-template-columns: 1fr auto;
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
}
h2 {
  font-size: var(--fs-20);
}
.hint {
  font-size: var(--fs-13);
  color: var(--ink-2);
  max-width: 520px;
}
.url {
  display: inline-flex;
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
@media (max-width: 720px) {
  .qp {
    grid-template-columns: 1fr;
  }
  .code {
    justify-self: center;
  }
}
</style>
