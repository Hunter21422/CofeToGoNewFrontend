<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'crema'
    size?: 'sm' | 'md' | 'lg'
    block?: boolean
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
    icon?: boolean
  }>(),
  { variant: 'primary', size: 'md', block: false, loading: false, disabled: false, type: 'button', icon: false },
)
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[variant, size, { block, loading, icon }]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span class="content"><slot /></span>
    <span v-if="loading" class="spinner" aria-hidden="true" />
  </button>
</template>

<style scoped>
.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--r-ctl);
  font-weight: 600;
  white-space: nowrap;
  transition:
    background-color 0.15s,
    transform 0.12s var(--ease),
    opacity 0.15s;
  user-select: none;
}
.btn:active:not(:disabled) {
  transform: scale(0.97);
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn.loading {
  opacity: 1;
}
.content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.loading .content {
  visibility: hidden;
}
.sm {
  height: 34px;
  padding: 0 12px;
  font-size: var(--fs-13);
  border-radius: 10px;
}
.md {
  height: 44px;
  padding: 0 18px;
  font-size: var(--fs-15);
}
.lg {
  height: 54px;
  padding: 0 22px;
  font-size: var(--fs-17);
  border-radius: 16px;
}
.icon.sm {
  width: 34px;
  padding: 0;
}
.icon.md {
  width: 44px;
  padding: 0;
}
.block {
  display: flex;
  width: 100%;
}
.primary {
  background: var(--primary);
  color: var(--on-primary);
}
.primary:hover:not(:disabled) {
  background: var(--primary-press);
}
.secondary {
  background: var(--surface-2);
  color: var(--ink);
}
.secondary:hover:not(:disabled) {
  background: var(--surface-3);
}
.ghost {
  color: var(--ink-2);
}
.ghost:hover:not(:disabled) {
  background: var(--surface-2);
  color: var(--ink);
}
.danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.crema {
  background: var(--crema);
  color: #3b2a0c;
}
.spinner {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(1turn);
  }
}
</style>
