<script setup lang="ts">
import { useAdmin } from '../stores/admin'

const admin = useAdmin()
const BOT = import.meta.env.VITE_BOT_USERNAME || 'kofe_s_toboy_bot'
</script>

<template>
  <main class="login">
    <section class="box">
      <img src="/favicon.svg" alt="" width="56" height="56" />
      <h1 class="t">Панель кофейни</h1>
      <p v-if="admin.error" class="err">{{ admin.error }}</p>
      <p class="muted">Вход только для команды. Добавить сотрудника может владелец в разделе «Команда».</p>

      <ol class="steps">
        <li><span class="n num">1</span><span>Откройте бота <a :href="`https://t.me/${BOT}`" target="_blank" rel="noopener">@{{ BOT }}</a> в Telegram</span></li>
        <li><span class="n num">2</span><span>Отправьте команду <code>/admin</code></span></li>
        <li><span class="n num">3</span><span>Откройте ссылку на этом устройстве — она одноразовая и живёт 2 минуты</span></li>
        <li><span class="n num">4</span><span>Введите свой PIN</span></li>
      </ol>

      <p class="faint small">С телефона проще: откройте бота и нажмите кнопку «Панель бариста» — войдёте сразу на шаг с PIN.</p>
    </section>
  </main>
</template>

<style scoped>
.login {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
}
.box {
  width: min(100%, 420px);
  display: grid;
  gap: 14px;
  padding: 28px 24px;
  border-radius: var(--r-sheet);
  background: var(--surface);
}
.t {
  font-size: var(--fs-24);
}
.err {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--danger-soft);
  color: var(--danger);
  font-weight: 600;
  font-size: var(--fs-13);
}
.steps {
  list-style: none;
  margin: 4px 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.steps li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.n {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: var(--fs-13);
}
.steps a {
  color: var(--primary);
  font-weight: 600;
}
code {
  font-family: var(--font-display);
  font-size: var(--fs-13);
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--surface-2);
}
.small {
  font-size: var(--fs-13);
}
</style>
