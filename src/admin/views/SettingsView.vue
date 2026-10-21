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
        <UiField v-model="s.loyalty.stamps_per_gift" type="number" label="Штампов до подарка" :hint="`Гость получает ${Number(s.loyalty.stamps_per_gift) + 1}-й напиток бесплатно`" />
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
    </div>
  </main>
</template>

<style scoped>
.form .card-title {
  margin: 0;
}
</style>
