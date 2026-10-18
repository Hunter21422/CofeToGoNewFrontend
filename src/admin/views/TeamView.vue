<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { LocationRead, StaffRead, StaffRole } from '@/shared/api/types'
import UiBadge from '@/shared/components/UiBadge.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import UiSwitch from '@/shared/components/UiSwitch.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { initials, ROLE_LABEL, time, when } from '@/shared/utils/format'
import { useAdmin } from '../stores/admin'

const admin = useAdmin()
const staff = ref<StaffRead[]>([])
const locations = ref<LocationRead[]>([])
const open = ref(false)
const form = reactive({ tg_id: '', role: 'barista' as StaffRole, location_id: null as number | null })

onMounted(async () => {
  const [s, l] = await Promise.all([adminApi.staff(), adminApi.locations()])
  staff.value = s
  locations.value = l
  form.location_id = l[0]?.id ?? null
})
async function add() {
  if (!/^\d{5,}$/.test(form.tg_id)) return toast('Telegram ID — это число, его покажет @userinfobot', 'error')
  try {
    staff.value.push(await adminApi.createStaff({ tg_id: Number(form.tg_id), role: form.role, location_id: form.role === 'owner' ? null : form.location_id }))
    open.value = false
    toast('Сотрудник добавлен. Пусть откроет панель через бота', 'ok')
  } catch (e) {
    toastError(e)
  }
}
async function patch(s: StaffRead, d: Partial<StaffRead>) {
  try {
    Object.assign(s, await adminApi.updateStaff(s.id, d))
  } catch (e) {
    toastError(e)
  }
}
const isMe = (s: StaffRead) => s.user.id === admin.me?.user.id
async function resetPin(s: StaffRead) {
  if (!confirm(`Сбросить PIN ${s.user.first_name}? Все его сеансы завершатся, при следующем входе он придумает новый PIN.`)) return
  try {
    Object.assign(s, await adminApi.resetStaffPin(s.id))
    toast('PIN сброшен, сеансы завершены', 'ok')
  } catch (e) {
    toastError(e)
  }
}
async function revoke(s: StaffRead) {
  if (!confirm(`Завершить все сеансы ${s.user.first_name}? На всех устройствах панель закроется.`)) return
  try {
    Object.assign(s, await adminApi.revokeStaffSessions(s.id))
    toast('Сеансы завершены', 'ok')
  } catch (e) {
    toastError(e)
  }
}
const ROLE_HINT: Record<StaffRole, string> = {
  barista: 'Очередь, касса, заказы и стоп-лист своей точки',
  manager: 'Плюс меню, гости, промокоды, отзывы и аналитика точки',
  owner: 'Всё, включая команду, точки, рассылки и настройки',
}
</script>

<template>
  <main class="page">
    <header class="page-head">
      <h1>Команда</h1>
      <UiButton @click="open = true"><Plus :size="18" />Сотрудник</UiButton>
    </header>

    <p class="muted intro">Сотрудником человек становится только здесь. Вход в панель — через Telegram и личный PIN, который сотрудник придумывает сам при первом входе.</p>

    <div class="table-wrap">
      <table class="t">
        <thead><tr><th>Сотрудник</th><th>Роль</th><th>Точка</th><th>PIN</th><th>Доступ</th><th /></tr></thead>
        <tbody>
          <tr v-for="s in staff" :key="s.id" :class="{ dim: !s.is_active }">
            <td>
              <span class="who">
                <span class="ava">{{ initials(s.user.first_name, s.user.last_name) }}</span>
                <span>
                  <span class="strong">{{ s.user.first_name }} {{ s.user.last_name }}</span><span v-if="s.user.username" class="faint"> @{{ s.user.username }}</span>
                  <span class="sub">{{ s.last_login_at ? `входил ${when(s.last_login_at)}` : 'ещё не входил' }}</span>
                </span>
              </span>
            </td>
            <td>
              <select class="select sm" :value="s.role" :disabled="s.role === 'owner'" @change="patch(s, { role: ($event.target as HTMLSelectElement).value as StaffRole })">
                <option v-for="r in ['barista', 'manager', 'owner'] as StaffRole[]" :key="r" :value="r">{{ ROLE_LABEL[r] }}</option>
              </select>
            </td>
            <td>
              <UiBadge v-if="s.location_id === null">Все точки</UiBadge>
              <select v-else class="select sm" :value="s.location_id" @change="patch(s, { location_id: Number(($event.target as HTMLSelectElement).value) })">
                <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
              </select>
            </td>
            <td>
              <UiBadge v-if="s.pin_locked_until" tone="danger">заблокирован до {{ time(s.pin_locked_until) }}</UiBadge>
              <UiBadge v-else-if="s.pin_set" tone="ok" dot>задан</UiBadge>
              <UiBadge v-else tone="warn">задаст при входе</UiBadge>
            </td>
            <td><UiSwitch :model-value="s.is_active" :disabled="s.role === 'owner'" @update:model-value="(v: boolean) => patch(s, { is_active: v })" /></td>
            <td class="acts">
              <template v-if="!isMe(s)">
                <UiButton size="sm" variant="ghost" :disabled="!s.pin_set" @click="resetPin(s)">Сбросить PIN</UiButton>
                <UiButton size="sm" variant="ghost" @click="revoke(s)">Выйти везде</UiButton>
              </template>
              <span v-else class="faint you">это вы</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiSheet :open="open" title="Новый сотрудник" @close="open = false">
      <div class="form">
        <UiField v-model="form.tg_id" label="Telegram ID" inputmode="numeric" placeholder="123456789" hint="Сотрудник должен хотя бы раз открыть бота кофейни. ID подскажет @userinfobot" />
        <div class="roles">
          <label v-for="r in ['barista', 'manager', 'owner'] as StaffRole[]" :key="r" class="role" :class="{ on: form.role === r }">
            <input v-model="form.role" type="radio" :value="r" class="visually-hidden" />
            <span class="strong">{{ ROLE_LABEL[r] }}</span>
            <span class="faint">{{ ROLE_HINT[r] }}</span>
          </label>
        </div>
        <label v-if="form.role !== 'owner'" class="sel">
          <span class="label">Точка</span>
          <select v-model="form.location_id" class="select">
            <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </label>
      </div>
      <template #footer><UiButton block size="lg" @click="add">Добавить в команду</UiButton></template>
    </UiSheet>
  </main>
</template>

<style scoped>
.intro {
  margin: -8px 0 16px;
  max-width: 70ch;
}
.who {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ava {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 700;
  font-size: var(--fs-11);
}
.select.sm {
  height: 34px;
  font-size: var(--fs-13);
}
.sub {
  display: block;
  font-size: var(--fs-11);
  color: var(--ink-3);
}
.acts {
  white-space: nowrap;
  text-align: right;
}
.you {
  font-size: var(--fs-11);
}
tr.dim td {
  opacity: 0.55;
}
.roles {
  display: grid;
  gap: 6px;
}
.role {
  display: grid;
  gap: 2px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 2px solid transparent;
  cursor: pointer;
  font-size: var(--fs-13);
}
.role.on {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.sel {
  display: grid;
  gap: 6px;
}
</style>
