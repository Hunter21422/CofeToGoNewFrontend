<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next'

const props = withDefaults(defineProps<{ min?: number; max?: number; size?: 'sm' | 'md' }>(), { min: 1, max: 20, size: 'md' })
const model = defineModel<number>({ required: true })
const emit = defineEmits<{ change: [number] }>()

function set(v: number) {
  const n = Math.min(props.max, Math.max(props.min, v))
  if (n !== model.value) {
    model.value = n
    emit('change', n)
  }
}
</script>

<template>
  <div class="stp" :class="size">
    <button type="button" :aria-label="model <= min ? 'Минимум' : 'Меньше'" :disabled="model <= min && min > 0" @click="set(model - 1)">
      <Minus :size="size === 'sm' ? 15 : 18" />
    </button>
    <span class="v num" aria-live="polite">{{ model }}</span>
    <button type="button" aria-label="Больше" :disabled="model >= max" @click="set(model + 1)">
      <Plus :size="size === 'sm' ? 15 : 18" />
    </button>
  </div>
</template>

<style scoped>
.stp {
  display: inline-flex;
  align-items: center;
  border-radius: var(--r-pill);
  background: var(--surface-2);
}
button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--ink);
}
button:disabled {
  color: var(--ink-3);
}
.v {
  min-width: 22px;
  text-align: center;
  font-size: var(--fs-15);
}
.sm button {
  width: 32px;
  height: 32px;
}
.sm .v {
  font-size: var(--fs-13);
  min-width: 16px;
}
</style>
