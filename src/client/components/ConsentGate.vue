<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '@/shared/components/UiButton.vue'
import { toastError } from '@/shared/composables/useToast'
import { useSession } from '../stores/session'

const session = useSession()
const agree = ref(false)
const ads = ref(false)
const busy = ref(false)

async function accept() {
  if (!agree.value) return
  busy.value = true
  try {
    await session.update({ pd_consent: true, ...(ads.value ? { marketing_consent: true } : {}) })
  } catch (e) {
    toastError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="cg">
    <section class="box">
      <h1 class="t">Ещё один шаг</h1>
      <p class="sub">Чтобы принимать ваши заказы и начислять штампы, нам нужно ваше согласие на обработку персональных данных: имени, телефона или Telegram и истории заказов.</p>

      <label class="ck">
        <input v-model="agree" type="checkbox" />
        <span>Я даю <RouterLink to="/legal/consent">согласие на обработку персональных данных</RouterLink> и ознакомлен(а) с <RouterLink to="/legal/policy">политикой обработки персональных данных</RouterLink></span>
      </label>
      <label class="ck">
        <input v-model="ads" type="checkbox" />
        <span>Хочу получать новинки и акции — <RouterLink to="/legal/ads">согласие на рассылки</RouterLink>. Необязательно, можно включить позже в профиле</span>
      </label>

      <p class="fine">Продолжая, вы принимаете <RouterLink to="/legal/terms">пользовательское соглашение</RouterLink> и <RouterLink to="/legal/loyalty">правила программы лояльности</RouterLink>.</p>

      <UiButton size="lg" block :disabled="!agree" :loading="busy" @click="accept">Продолжить</UiButton>
    </section>
  </main>
</template>

<style scoped>
.cg {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px 16px calc(24px + env(safe-area-inset-bottom));
}
.box {
  width: min(100%, 420px);
  display: grid;
  gap: 16px;
}
.t {
  font-size: var(--fs-24);
}
.sub {
  color: var(--ink-2);
  line-height: 1.45;
}
.ck {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 14px;
  border-radius: var(--r-tile);
  background: var(--surface);
  font-size: var(--fs-15);
  line-height: 1.4;
  cursor: pointer;
}
.ck input {
  width: 20px;
  height: 20px;
  margin-top: 1px;
  flex: none;
  accent-color: var(--primary);
}
.ck a,
.fine a {
  color: var(--primary);
  text-decoration: underline;
}
.fine {
  font-size: var(--fs-13);
  color: var(--ink-2);
  line-height: 1.4;
}
</style>
