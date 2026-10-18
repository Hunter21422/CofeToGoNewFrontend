<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string | null
    type?: string
    placeholder?: string
    multiline?: boolean
    rows?: number
    maxlength?: number
    inputmode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'search'
    autocomplete?: string
    disabled?: boolean
    suffix?: string
    mono?: boolean
  }>(),
  { type: 'text', rows: 3, multiline: false },
)
const model = defineModel<string | number | null>({ default: '' })
const id = useId()
</script>

<template>
  <div class="field" :class="{ invalid: !!error, disabled }">
    <label v-if="label" :for="id" class="label">{{ label }}</label>
    <div class="ctl">
      <slot name="prefix" />
      <textarea
        v-if="multiline"
        :id="id"
        v-model="model"
        :rows="rows"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :disabled="disabled"
        :aria-invalid="!!error || undefined"
        :aria-describedby="error || hint ? id + '-d' : undefined"
      />
      <input
        v-else
        :id="id"
        v-model="model"
        :type="type"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :inputmode="inputmode"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :class="{ mono }"
        :aria-invalid="!!error || undefined"
        :aria-describedby="error || hint ? id + '-d' : undefined"
      />
      <span v-if="suffix" class="suffix">{{ suffix }}</span>
      <slot name="suffix" />
    </div>
    <p v-if="error || hint" :id="id + '-d'" class="desc" :class="{ err: !!error }">{{ error || hint }}</p>
  </div>
</template>

<style scoped>
.field {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.label {
  font-size: var(--fs-13);
  font-weight: 600;
  color: var(--ink-2);
}
.ctl {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 14px;
  border-radius: var(--r-ctl);
  background: var(--surface-2);
  border: 1.5px solid transparent;
  transition:
    border-color 0.15s,
    background-color 0.15s;
}
.ctl:focus-within {
  border-color: var(--primary);
  background: var(--surface);
}
.invalid .ctl {
  border-color: var(--danger);
}
input,
textarea {
  flex: 1;
  min-width: 0;
  width: 100%;
  border: 0;
  background: none;
  outline: none;
  padding: 12px 0;
}
textarea {
  resize: vertical;
  min-height: 72px;
}
.mono {
  font-family: var(--font-display);
  letter-spacing: 0.04em;
}
input::placeholder,
textarea::placeholder {
  color: var(--ink-3);
}
.suffix {
  color: var(--ink-3);
  font-size: var(--fs-13);
}
.desc {
  font-size: var(--fs-13);
  color: var(--ink-3);
}
.desc.err {
  color: var(--danger);
}
.disabled {
  opacity: 0.6;
}
</style>
