<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { SettingsOut } from '@/shared/api/types'
import StampCard from '@/shared/components/StampCard.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSwitch from '@/shared/components/UiSwitch.vue'
import { toast, toastError } from '@/shared/composables/useToast'

const s = ref<SettingsOut | null>(null)
const saving = ref(false)
onMounted(async () => (s.value = await adminApi.settings()))

async function save() {
  if (!s.value) return
  const t = s.value.texts
  if (![t.order_accepted, t.order_ready, t.order_cancelled].every((x) => x.includes('{number}')))
    return toast('В текстах о заказе оставьте {number} — туда подставится номер', 'error')
  const tips = s.value.tips
  tips.url = tips.url?.trim() || null
  if (tips.url && !tips.url.startsWith('https://')) return toast('Ссылка на чаевые должна начинаться с https://', 'error')
  if (tips.enabled && !tips.url) return toast('Чтобы включить чаевые, укажите ссылку', 'error')
  if (!tips.text.trim()) return toast('Напишите текст для гостей про чаевые', 'error')
  saving.value = true
  try {
    s.value = await adminApi.updateSettings({
      ...s.value,
      loyalty: { ...s.value.loyalty, stamps_per_gift: Number(s.value.loyalty.stamps_per_gift), referral_stamps: Number(s.value.loyalty.referral_stamps) },
    })
    toast('Настройки сохранены', 'ok')
  } catch (e) {
    toastError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="page">
    <header class="page-head">
      <h1>Настройки</h1>
      <UiButton :loading="saving" :disabled="!s" @click="save">Сохранить</UiButton>
    </header>

    <div v-if="s" class="grid-2">
      <section class="card form">
        <h2 class="card-title">Карта лояльности</h2>
        <StampCard :stamps="Math.max(0, Number(s.loyalty.stamps_per_gift) - 1)" :per-gift="Number(s.loyalty.stamps_per_gift) || 5" compact />
        <UiField v-model="s.loyalty.stamps_per_gift" type="number" label="Штампов до подарка" :hint="`Штамп за каждый заказ с напитком. В ${Number(s.loyalty.stamps_per_gift) + 1}-м заказе гость получает напиток бесплатно`" />
        <UiField v-model="s.loyalty.gift_expire_days" type="number" label="Подарок сгорает без визитов" suffix="дней" hint="Срок считается от последнего заказа или списания. Пусто — не сгорает" />
        <UiField v-model="s.loyalty.stamps_expire_days" type="number" label="Штампы сгорают без визитов" suffix="дней" hint="Срок считается от последнего штампа. Пусто — не сгорают. Гость видит правило на карте" />
        <UiField v-model="s.loyalty.referral_stamps" type="number" label="Штампов за приглашённого друга" />
        <UiSwitch v-model="s.loyalty.gift_with_modifiers" label="Подарок вместе с добавками" hint="Сиропы и альтернативное молоко к подарочному напитку тоже бесплатно. Выключите, чтобы гость доплачивал за добавки" />
        <UiSwitch v-model="s.loyalty.birthday_gift" label="Напиток в подарок на день рождения" />
      </section>

      <section class="card form">
        <h2 class="card-title">Заказы</h2>
        <UiField v-model="s.orders.payment_timeout_min" type="number" label="Ждать онлайн-оплату" suffix="мин" hint="Потом заказ отменится сам" />
        <UiField v-model="s.orders.accept_timeout_min" type="number" label="Напомнить, если заказ не приняли" suffix="мин" />
        <UiField v-model="s.orders.max_items_per_order" type="number" label="Позиций в заказе, не больше" />
      </section>

      <section class="card form">
        <h2 class="card-title">Сообщения гостям в Telegram</h2>
        <UiField v-model="s.texts.order_accepted" label="Заказ принят" hint="{number} — номер заказа" />
        <UiField v-model="s.texts.order_ready" label="Заказ готов" />
        <UiField v-model="s.texts.order_cancelled" label="Заказ отменён" />
        <UiField v-model="s.texts.gift_unlocked" label="Открыт подарок" />
      </section>

      <section class="card form">
        <h2 class="card-title">Акции</h2>
        <UiSwitch v-model="s.deal.soda_enabled" label="2 напитка 0,4 — газировка в подарок" hint="За каждые два напитка объёмом 0,4 л одна банка Coca-Cola, Sprite или Fanta из категории «Газировка» становится бесплатной. Гость видит подсказку в корзине" />
      </section>

      <section class="card form">
        <h2 class="card-title">Чаевые баристе</h2>
        <UiSwitch v-model="s.tips.enabled" label="Предлагать оставить чаевые" hint="После выдачи заказа гость видит в заказе небольшую карточку со ссылкой. Ничего не всплывает и не мешает" />
        <UiField v-model="s.tips.url" label="Ссылка на чаевые" placeholder="https://pay.cloudtips.ru/…" hint="CloudTips, Нетмонет или другой сервис. Если есть табличка с QR — наведите на неё камеру телефона и скопируйте ссылку" />
        <UiField v-model="s.tips.text" label="Текст для гостя" multiline :rows="2" :maxlength="200" />
        <UiSwitch v-model="s.tips.after_order_message" label="Сообщение в Telegram после выдачи" hint="«Спасибо, что заглянули» с кнопками «Оставить на чай» и «Оценить заказ». Одному гостю — не чаще раза в сутки" />
      </section>
    </div>
  </main>
</template>

<style scoped>
.form .card-title {
  margin: 0;
}
</style>
