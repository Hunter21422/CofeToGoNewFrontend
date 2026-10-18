<script setup lang="ts">
defineProps<{ label?: string; hint?: string; disabled?: boolean }>()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="sw" :class="{ disabled }">
    <span v-if="label || hint || $slots.default" class="text">
      <slot>
        <span class="label">{{ label }}</span>
      </slot>
      <span v-if="hint" class="hint">{{ hint }}</span>
    </span>
    <input v-model="model" type="checkbox" role="switch" :disabled="disabled" class="visually-hidden" />
    <span class="track" :class="{ on: model }" aria-hidden="true"><span class="knob" /></span>
  </label>
</template>

<style scoped>
.sw {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-height: 44px;
}
.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.text {
  flex: 1;
  display: grid;
  gap: 2px;
}
.label {
  font-weight: 500;
}
.hint {
  font-size: var(--fs-13);
  color: var(--ink-3);
}
.track {
  flex: none;
  width: 46px;
  height: 28px;
  border-radius: 14px;
  background: var(--surface-3);
  padding: 3px;
  transition: background-color 0.18s;
}
.track.on {
  background: var(--primary);
}
.knob {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.25);
  transition: transform 0.22s var(--ease);
}
.on .knob {
  transform: translateX(18px);
}
:root[data-theme='dark'] .on .knob {
  background: var(--on-primary);
}
input:focus-visible + .track {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
</style>
