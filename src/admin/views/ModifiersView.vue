<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'
import { adminApi } from '@/shared/api/admin'
import type { ModifierGroupAdminRead } from '@/shared/api/types'
import UiBadge from '@/shared/components/UiBadge.vue'
import UiButton from '@/shared/components/UiButton.vue'
import UiField from '@/shared/components/UiField.vue'
import UiSheet from '@/shared/components/UiSheet.vue'
import UiSwitch from '@/shared/components/UiSwitch.vue'
import { toast, toastError } from '@/shared/composables/useToast'
import { money } from '@/shared/utils/format'

const groups = ref<ModifierGroupAdminRead[]>([])
const open = ref(false)
const editing = ref<ModifierGroupAdminRead | null>(null)
const saving = ref(false)
const form = reactive({
  name: '',
  min_select: 0,
  max_select: 1,
  is_active: true,
  modifiers: [] as { id: number | null; name: string; price: string; is_default: boolean; is_active: boolean }[],
})

onMounted(async () => (groups.value = await adminApi.modifierGroups()))

function edit(g: ModifierGroupAdminRead | null) {
  editing.value = g
  Object.assign(form, {
    name: g?.name ?? '',
    min_select: g?.min_select ?? 0,
    max_select: g?.max_select ?? 1,
    is_active: g?.is_active ?? true,
    modifiers: (g?.modifiers ?? []).map((m) => ({ id: m.id, name: m.name, price: m.price_delta ? String(m.price_delta / 100) : '', is_default: m.is_default, is_active: m.is_active })),
  })
  if (!form.modifiers.length) form.modifiers.push({ id: null, name: '', price: '', is_default: false, is_active: true })
  open.value = true
}

async function save() {
  const mods = form.modifiers.filter((m) => m.name.trim())
  if (!form.name.trim() || !mods.length) return toast('Нужны название группы и хотя бы одна добавка', 'error')
  if (form.max_select < form.min_select) return toast('«Не больше» должно быть не меньше «Минимум»', 'error')
  saving.value = true
  const payload = {
    name: form.name.trim(),
    min_select: Number(form.min_select),
    max_select: Math.min(Number(form.max_select), mods.length),
    is_active: form.is_active,
    modifiers: mods.map((m, i) => ({ id: m.id, name: m.name.trim(), price_delta: Math.round(Number(m.price.replace(',', '.') || 0) * 100), is_default: m.is_default, is_active: m.is_active, sort_order: i })),
  }
  try {
    if (editing.value) Object.assign(editing.value, await adminApi.updateModifierGroup(editing.value.id, payload))
    else groups.value.push(await adminApi.createModifierGroup(payload))
    open.value = false
    toast('Группа добавок сохранена', 'ok')
  } catch (e) {
    toastError(e)
  } finally {
    saving.value = false
  }
}
async function remove() {
  if (!editing.value || !confirm(`Удалить группу «${editing.value.name}»? Она пропадёт у всех товаров.`)) return
  await adminApi.deleteModifierGroup(editing.value.id)
  groups.value = groups.value.filter((g) => g.id !== editing.value!.id)
  open.value = false
}
function rule(g: { min_select: number; max_select: number }) {
  if (g.min_select > 0 && g.max_select === 1) return 'Обязательно, одна'
  if (g.min_select > 0) return `Обязательно, до ${g.max_select}`
  if (g.max_select === 1) return 'По желанию, одна'
  return `По желанию, до ${g.max_select}`
}
</script>

<template>
  <main class="page">
    <header class="page-head">
      <h1>Добавки</h1>
      <UiButton @click="edit(null)"><Plus :size="18" />Группа</UiButton>
    </header>
    <p class="muted intro">Молоко, сиропы, доп. шот. Группу подключаете к товару в его карточке в разделе «Меню».</p>

    <div class="grid">
      <button v-for="g in groups" :key="g.id" class="card grp" :class="{ off: !g.is_active }" @click="edit(g)">
        <span class="gh">
          <span class="gn">{{ g.name }}</span>
          <UiBadge :tone="g.min_select > 0 ? 'warn' : 'neutral'">{{ rule(g) }}</UiBadge>
        </span>
        <span class="mods">
          <span v-for="m in g.modifiers" :key="m.id" class="mod" :class="{ off: !m.is_active }">
            <span>{{ m.name }}</span>
            <b>{{ m.price_delta ? `+${money(m.price_delta)}` : 'бесплатно' }}</b>
          </span>
        </span>
      </button>
    </div>

    <UiSheet :open="open" :title="editing ? editing.name : 'Новая группа'" @close="open = false">
      <div class="form">
        <UiField v-model="form.name" label="Название группы" placeholder="Сироп" />
        <div class="form-row">
          <UiField v-model="form.min_select" type="number" label="Минимум" hint="0 — по желанию" />
          <UiField v-model="form.max_select" type="number" label="Не больше" hint="1 — выбрать можно одну" />
        </div>
        <UiSwitch v-model="form.is_active" label="Группа включена" />

        <div>
          <span class="label">Добавки</span>
          <div class="rows">
            <div v-for="(m, i) in form.modifiers" :key="i" class="mrow">
              <UiField v-model="m.name" placeholder="Название" />
              <UiField v-model="m.price" placeholder="0" suffix="₽" inputmode="decimal" />
              <label class="dflt"><input v-model="m.is_default" type="checkbox" />по умолч.</label>
              <button class="rm" aria-label="Убрать" @click="form.modifiers.splice(i, 1)"><Trash2 :size="16" /></button>
            </div>
          </div>
          <UiButton variant="ghost" size="sm" @click="form.modifiers.push({ id: null, name: '', price: '', is_default: false, is_active: true })">
            <Plus :size="16" />Добавка
          </UiButton>
        </div>
      </div>
      <template #footer>
        <div class="foot2">
          <UiButton v-if="editing" variant="danger" @click="remove">Удалить</UiButton>
          <UiButton block :loading="saving" @click="save">Сохранить</UiButton>
        </div>
      </template>
    </UiSheet>
  </main>
</template>

<style scoped>
.intro {
  margin: -8px 0 16px;
  max-width: 60ch;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.grp {
  display: grid;
  gap: 12px;
  text-align: left;
  align-content: start;
}
.grp:hover {
  box-shadow: var(--shadow-lift);
}
.grp.off {
  opacity: 0.55;
}
.gh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.gn {
  font-family: var(--font-display);
  font-weight: 600;
}
.mods {
  display: grid;
  width: 100%;
}
.mod {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-top: 1px solid var(--line);
  font-size: var(--fs-13);
  text-align: left;
}
.mod b {
  font-weight: 500;
  color: var(--ink-3);
  white-space: nowrap;
}
.mod.off {
  text-decoration: line-through;
  color: var(--ink-3);
}
.rows {
  display: grid;
  gap: 6px;
  margin: 6px 0;
}
.mrow {
  display: grid;
  grid-template-columns: 1fr 100px auto 30px;
  gap: 6px;
  align-items: center;
}
.mrow :deep(.ctl) {
  min-height: 42px;
}
.dflt {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-11);
  color: var(--ink-3);
  white-space: nowrap;
}
.dflt input {
  accent-color: var(--primary);
}
.rm {
  color: var(--ink-3);
}
.foot2 {
  display: flex;
  gap: 8px;
}
</style>
