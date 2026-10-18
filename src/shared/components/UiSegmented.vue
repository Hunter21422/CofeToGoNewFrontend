<script setup lang="ts" generic="T extends string | number">
defineProps<{
  options: { value: T; label: string; hint?: string; disabled?: boolean }[]
  label?: string
  size?: 'sm' | 'md'
}>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="seg" :class="size ?? 'md'" role="radiogroup" :aria-label="label">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      :aria-checked="model === o.value"
      :disabled="o.disabled"
      class="opt"
      :class="{ on: model === o.value }"
      @click="model = o.value"
    >
      <span class="l">{{ o.label }}</span>
      <span v-if="o.hint" class="h">{{ o.hint }}</span>
    </button>
  </div>
</template>

<style scoped>
.l {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.seg {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: var(--surface-2);
}
.opt {
  flex: 1;
  min-width: 0;
  display: grid;
  place-items: center;
  gap: 1px;
  padding: 8px 6px;
  border-radius: 10px;
  color: var(--ink-2);
  font-weight: 600;
  white-space: nowrap;
  transition:
    background-color 0.16s,
    color 0.16s;
}
.sm .opt {
  padding: 6px 10px;
  font-size: var(--fs-13);
}
.opt.on {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-lift);
}
.opt:disabled {
  opacity: 0.4;
  text-decoration: line-through;
}
.h {
  font-size: var(--fs-11);
  font-weight: 500;
  color: var(--ink-3);
}
.on .h {
  color: var(--ink-2);
}
</style>
