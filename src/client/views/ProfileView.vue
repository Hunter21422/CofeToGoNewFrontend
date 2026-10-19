<script setup lang="ts">
import { Cake, ChevronRight, Copy, Heart, History, LogOut, MapPin, Phone, Trash2 } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { clientApi } from '@/shared/api/client'
import type { FavoriteRead } from '@/shared/api/types'
import ProductArt from '@/shared/components/ProductArt.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import UiSwitch from '@/shared/components/UiSwitch.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { tg } from '@/shared/telegram'
import { date, initials, money, phone as fmtPhone } from '@/shared/utils/format'
import LocationSheet from '../components/LocationSheet.vue'
import { usePush } from '../composables/usePush'
import { useCart } from '../stores/cart'
import { useSession } from '../stores/session'

const session = useSession()
async function logout() {
  if (!confirm('Выйти из аккаунта на этом устройстве?')) return
  useCart().clear()
  await session.logout()
}
const cart = useCart()
const favorites = ref<FavoriteRead[]>([])
const locOpen = ref(false)
const phoneOpen = ref(false)
const bdayOpen = ref(false)
const phoneInput = ref('')
const bdayInput = ref('')
const saving = ref(false)

const push = usePush()
onMounted(async () => {
  push.check()
  favorites.value = await clientApi.favorites()
})
async function togglePush(v: boolean) {
  try {
    if (!v) return await push.disable()
    if (await push.enable()) toast('Готово: сообщим о заказе на этом устройстве', 'ok')
    else toast('Уведомления запрещены в настройках браузера', 'error')
  } catch (e) {
    toastError(e)
  }
}

async function addPhone() {
  // в Telegram — нативный запрос контакта, иначе ввод руками
  const p = await tg.requestPhone()
  if (p) return savePhone(p.startsWith('+') ? p : `+${p}`)
  phoneInput.value = session.user?.phone ?? '+7'
  phoneOpen.value = true
}
async function savePhone(p = phoneInput.value) {
  const digits = p.replace(/\D/g, '')
  if (digits.length !== 11) return toast('Номер должен быть из 11 цифр, например +7 999 123-45-67', 'error')
  saving.value = true
  try {
    await session.setPhone(`+7${digits.slice(1)}`)
    phoneOpen.value = false
    toast('Номер сохранён — теперь бариста найдёт вас по нему', 'ok')
  } catch (e) {
    toastError(e)
  } finally {
    saving.value = false
  }
}
async function saveBday() {
  saving.value = true
  try {
    await session.update({ birth_date: bdayInput.value })
    bdayOpen.value = false
    toast('Записали. В день рождения кофе за нами', 'ok')
  } catch (e) {
    toastError(e)
  } finally {
    saving.value = false
  }
}
async function setFlag(key: 'notifications_enabled' | 'marketing_consent', v: boolean) {
  try {
    await session.update({ [key]: v })
  } catch (e) {
    toastError(e)
  }
}
async function copyRef() {
  const code = session.user?.referral_code ?? ''
  try {
    await navigator.clipboard.writeText(code)
    toast('Код скопирован', 'ok')
  } catch {
    toast(`Ваш код: ${code}`)
  }
}
function orderFav(f: FavoriteRead) {
  if (!f.variant) return
  cart.add({
    product_id: f.product.id, variant_id: f.variant.id, modifier_ids: f.modifiers.map((m) => m.id), quantity: 1,
    name: f.product.name, slug: f.product.slug, image_url: f.product.image_url, variant_name: f.variant.name,
    modifier_names: f.modifiers.filter((m) => !(m.is_default && m.price_delta === 0)).map((m) => m.name), unit_price: f.price, counts_for_loyalty: true,
  })
  tg.haptic.success()
  toast(`${f.custom_name ?? f.product.name} в корзине`, 'ok')
}
async function removeFav(f: FavoriteRead) {
  await clientApi.removeFavorite(f.id)
  favorites.value = favorites.value.filter((x) => x.id !== f.id)
}
</script>

<template>
  <main class="screen">
    <header v-if="session.user" class="me">
      <span class="ava">
        <img v-if="session.user.photo_url" :src="session.user.photo_url" alt="" />
        <span v-else>{{ initials(session.user.first_name, session.user.last_name) }}</span>
      </span>
      <div>
        <h1 class="name">{{ session.user.first_name }} {{ session.user.last_name }}</h1>
        <p v-if="session.user.username" class="muted">@{{ session.user.username }}</p>
      </div>
    </header>

    <section class="panel">
      <RouterLink to="/orders" class="row">
        <History :size="20" class="faint" />
        <span class="row-main"><span class="row-title">Мои заказы</span></span>
        <ChevronRight :size="18" class="faint" />
      </RouterLink>
      <button class="row" @click="locOpen = true">
        <MapPin :size="20" class="faint" />
        <span class="row-main">
          <span class="row-title">Моя кофейня</span>
          <span class="row-sub">{{ session.location?.name }}</span>
        </span>
        <ChevronRight :size="18" class="faint" />
      </button>
    </section>

    <section v-if="favorites.length" class="section">
      <h2 class="section-title ftitle"><Heart :size="17" /> Избранное</h2>
      <div class="panel">
        <div v-for="f in favorites" :key="f.id" class="row fav">
          <ProductArt :slug="f.product.slug" :image-url="f.product.image_url" :size="52" />
          <span class="row-main">
            <span class="row-title">{{ f.custom_name ?? f.product.name }}</span>
            <span class="row-sub">
              {{ f.product.name }} {{ f.variant?.name }}<span v-for="m in f.modifiers" :key="m.id" class="fmod">+ {{ m.name }}</span>
            </span>
          </span>
          <UiButton size="sm" :disabled="!f.is_available" @click="orderFav(f)">{{ money(f.price) }}</UiButton>
          <button class="rm" aria-label="Убрать из избранного" @click="removeFav(f)"><Trash2 :size="16" /></button>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title ftitle">Данные</h2>
      <div class="panel">
        <button class="row" @click="addPhone">
          <Phone :size="20" class="faint" />
          <span class="row-main">
            <span class="row-title">{{ session.user?.phone ? fmtPhone(session.user.phone) : 'Добавить телефон' }}</span>
            <span class="row-sub">По номеру бариста найдёт вашу карту, если нет телефона под рукой</span>
          </span>
          <ChevronRight :size="18" class="faint" />
        </button>
        <button class="row" :disabled="!!session.user?.birth_date" @click="(bdayInput = ''), (bdayOpen = true)">
          <Cake :size="20" class="faint" />
          <span class="row-main">
            <span class="row-title">{{ session.user?.birth_date ? date(session.user.birth_date) : 'Указать день рождения' }}</span>
            <span class="row-sub">{{ session.user?.birth_date ? 'В этот день напиток за наш счёт' : 'Подарим напиток в этот день. Изменить потом нельзя' }}</span>
          </span>
        </button>
      </div>
    </section>

    <section v-if="session.user" class="section">
      <h2 class="section-title ftitle">Уведомления</h2>
      <div class="panel switches">
        <UiSwitch
          :model-value="session.user.notifications_enabled"
          label="Статус заказа"
          :hint="tg.inTelegram ? 'Напишем в Telegram, когда заказ будет готов' : 'Сообщим, когда заказ будет готов'"
          @update:model-value="(v: boolean) => setFlag('notifications_enabled', v)"
        />
        <UiSwitch
          :model-value="session.user.marketing_consent"
          label="Новинки и акции"
          hint="Не чаще пары раз в месяц"
          @update:model-value="(v: boolean) => setFlag('marketing_consent', v)"
        />
        <UiSwitch
          v-if="push.supported && !push.needsInstall"
          :model-value="push.enabled.value"
          :disabled="push.busy.value"
          label="Уведомления на этом устройстве"
          :hint="push.denied.value ? 'Запрещены в настройках браузера — разрешите их для этого сайта' : 'Как от приложения: заказ готов, подарок открыт'"
          @update:model-value="togglePush"
        />
        <p v-else-if="push.needsInstall" class="faint push-hint">
          Чтобы получать уведомления на iPhone, добавьте сайт на экран «Домой»: «Поделиться» → «На экран Домой», и откройте его оттуда.
        </p>
      </div>
    </section>

    <section v-if="session.user" class="section ref">
      <div>
        <h2 class="section-title">Позовите друга</h2>
        <p class="muted">Когда друг сделает первый заказ с вашим кодом, вам обоим поставим по штампу.</p>
      </div>
      <button class="refcode num" @click="copyRef">{{ session.user.referral_code }} <Copy :size="16" /></button>
    </section>

    <section v-if="!tg.inTelegram" class="section">
      <UiButton variant="ghost" block @click="logout"><LogOut :size="18" /> Выйти из аккаунта</UiButton>
    </section>

    <LocationSheet :open="locOpen" @close="locOpen = false" />

    <UiSheet :open="phoneOpen" title="Телефон" @close="phoneOpen = false">
      <UiField v-model="phoneInput" type="tel" inputmode="tel" autocomplete="tel" label="Номер" placeholder="+7 999 123-45-67" />
      <template #footer><UiButton block size="lg" :loading="saving" @click="savePhone()">Сохранить номер</UiButton></template>
    </UiSheet>

    <UiSheet :open="bdayOpen" title="День рождения" @close="bdayOpen = false">
      <UiField v-model="bdayInput" type="date" label="Дата" hint="Проверьте дату — поменять её потом не получится" />
      <template #footer><UiButton block size="lg" :loading="saving" :disabled="!bdayInput" @click="saveBday">Сохранить</UiButton></template>
    </UiSheet>
  </main>
</template>

<style scoped>
.me {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 0 20px;
}
.ava {
  flex: none;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--primary);
  color: var(--on-primary);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--fs-20);
}
.ava img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.name {
  font-size: var(--fs-20);
}
.row {
  width: 100%;
  text-align: left;
}
.row:disabled {
  cursor: default;
}
.ftitle {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.fav .rm {
  color: var(--ink-3);
  padding: 6px;
}
.switches {
  padding: 6px 16px;
}
.switches :deep(.sw + .sw) {
  border-top: 1px solid var(--line);
  padding-top: 8px;
  margin-top: 4px;
}
.switches :deep(.sw) {
  padding: 6px 0;
}
.ref {
  display: grid;
  gap: 12px;
  padding: 18px 16px;
  border-radius: var(--r-card);
  background: var(--primary-soft);
}
.ref .section-title {
  margin-bottom: 4px;
}
.refcode {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 16px;
  border-radius: 12px;
  background: var(--surface);
  font-size: var(--fs-17);
  letter-spacing: 0.06em;
}
.fmod {
  display: block;
}
.push-hint {
  margin: 0;
  padding: 4px 2px;
  font-size: var(--fs-13);
}
</style>
