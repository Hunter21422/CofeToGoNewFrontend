<script setup lang="ts">
import { CircleAlert, Check, Info } from 'lucide-vue-next'
import { toasts, dismiss } from '../composables/useToast'
</script>

<template>
  <Teleport to="body">
    <div class="host" aria-live="polite">
      <TransitionGroup name="t">
        <button v-for="t in toasts" :key="t.id" class="toast" :class="t.tone" @click="dismiss(t.id)">
          <Check v-if="t.tone === 'ok'" :size="18" />
          <CircleAlert v-else-if="t.tone === 'error'" :size="18" />
          <Info v-else :size="18" />
          <span>{{ t.text }}</span>
        </button>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.host {
  position: fixed;
  top: max(12px, env(safe-area-inset-top));
  left: 0;
  right: 0;
  z-index: 90;
  display: grid;
  justify-items: center;
  gap: 8px;
  pointer-events: none;
  padding: 0 16px;
}
.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 440px;
  padding: 12px 16px;
  border-radius: 14px;
  background: var(--ink);
  color: var(--paper);
  font-weight: 500;
  text-align: left;
  box-shadow: 0 12px 30px -10px rgb(0 0 0 / 0.4);
}
.toast.ok svg {
  color: #8fd1ac;
}
.toast.error svg {
  color: #ff8a78;
}
:root[data-theme='dark'] .toast.ok svg {
  color: var(--ok);
}
.t-enter-active,
.t-leave-active {
  transition:
    transform 0.3s var(--ease),
    opacity 0.3s;
}
.t-enter-from,
.t-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
