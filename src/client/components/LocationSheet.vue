<script setup lang="ts">
import { Check, Clock, MapPin } from 'lucide-vue-next'
import UiSheet from '@/shared/components/UiSheet.vue'
import type { LocationRead } from '@/shared/api/types'
import { tg } from '@/shared/telegram'
import { useSession } from '../stores/session'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const session = useSession()

function todayHours(l: LocationRead) {
  const wd = (new Date().getDay() + 6) % 7
  const h = l.hours.find((x) => x.weekday === wd)
  if (!h || h.is_closed) return 'Сегодня выходной'
  return `${h.opens_at}–${h.closes_at}`
}
function pick(id: number) {
  tg.haptic.select()
  session.setLocation(id)
  emit('close')
}
</script>

<template>
  <UiSheet :open="open" title="Где заберёте заказ" @close="emit('close')">
    <div class="list">
      <button v-for="l in session.locations" :key="l.id" class="loc" :class="{ on: l.id === session.locationId }" @click="pick(l.id)">
        <span class="pin"><MapPin :size="20" /></span>
        <span class="main">
          <span class="name">{{ l.name }}</span>
          <span class="addr">{{ l.address }}</span>
          <span class="meta">
            <span class="state" :class="{ open: l.is_open_now && l.accepts_orders }">
              {{ !l.accepts_orders ? 'Онлайн-заказы на паузе' : l.is_open_now ? 'Открыто' : 'Закрыто' }}
            </span>
            <span class="hours"><Clock :size="13" />{{ todayHours(l) }}</span>
            <span class="hours">готовим ~{{ l.avg_prep_minutes }} мин</span>
          </span>
        </span>
        <Check v-if="l.id === session.locationId" :size="20" class="check" />
      </button>
    </div>
  </UiSheet>
</template>

<style scoped>
.list {
  display: grid;
  gap: 8px;
}
.loc {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  border-radius: 16px;
  background: var(--surface-2);
  text-align: left;
  border: 2px solid transparent;
}
.loc.on {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.pin {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--surface);
  color: var(--primary);
}
.main {
  flex: 1;
  display: grid;
  gap: 2px;
}
.name {
  font-weight: 600;
}
.addr {
  color: var(--ink-2);
  font-size: var(--fs-13);
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 6px;
  font-size: var(--fs-13);
}
.state {
  font-weight: 600;
  color: var(--danger);
}
.state.open {
  color: var(--ok);
}
.hours {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-3);
}
.check {
  color: var(--primary);
  margin-top: 10px;
}
</style>
