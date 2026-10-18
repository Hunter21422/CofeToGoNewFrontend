<script setup lang="ts">
/** Нижняя шторка: свайп вниз или клик по фону закрывает. На широких экранах — модалка по центру. */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(defineProps<{ open: boolean; title?: string; maxHeight?: string; padded?: boolean }>(), {
  title: undefined,
  maxHeight: '92dvh',
  padded: true,
})
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
const dragY = ref(0)
let startY: number | null = null

function onStart(e: PointerEvent) {
  if (panel.value && panel.value.scrollTop > 0) return
  startY = e.clientY
}
function onMove(e: PointerEvent) {
  if (startY === null) return
  dragY.value = Math.max(0, e.clientY - startY)
}
function onEnd() {
  if (startY === null) return
  if (dragY.value > 110) emit('close')
  dragY.value = 0
  startY = null
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  async (v) => {
    document.documentElement.style.overflow = v ? 'hidden' : ''
    if (v) {
      window.addEventListener('keydown', onKey)
      await nextTick()
      panel.value?.focus({ preventScroll: true })
    } else window.removeEventListener('keydown', onKey)
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="wrap" @click.self="emit('close')">
        <div
          ref="panel"
          class="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          :style="{ maxHeight, transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragY ? 'none' : undefined }"
        >
          <div class="grip" @pointerdown="onStart" @pointermove="onMove" @pointerup="onEnd" @pointercancel="onEnd">
            <span />
          </div>
          <header v-if="title || $slots.header" class="head">
            <slot name="header"><h2 class="title">{{ title }}</h2></slot>
          </header>
          <div class="body" :class="{ padded }">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.wrap {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: var(--scrim);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.panel {
  width: 100%;
  max-width: 560px;
  background: var(--surface);
  border-radius: var(--r-sheet) var(--r-sheet) 0 0;
  box-shadow: var(--shadow-sheet);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  outline: none;
  transition: transform 0.32s var(--ease);
  padding-bottom: var(--safe-bottom);
}
.grip {
  flex: none;
  height: 22px;
  display: grid;
  place-items: center;
  touch-action: none;
  cursor: grab;
}
.grip span {
  width: 40px;
  height: 5px;
  border-radius: 3px;
  background: var(--surface-3);
}
.head {
  flex: none;
  padding: 2px 20px 10px;
}
.title {
  font-size: var(--fs-20);
}
.body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.body.padded {
  padding: 4px 20px 20px;
}
.foot {
  flex: none;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}
@media (min-width: 720px) {
  .wrap {
    align-items: center;
    padding: 24px;
  }
  .panel {
    border-radius: var(--r-sheet);
    padding-bottom: 0;
  }
}
.sheet-enter-active,
.sheet-leave-active {
  transition: background-color 0.3s;
}
.sheet-enter-active .panel,
.sheet-leave-active .panel {
  transition: transform 0.34s var(--ease);
}
.sheet-enter-from,
.sheet-leave-to {
  background-color: transparent;
}
.sheet-enter-from .panel,
.sheet-leave-to .panel {
  transform: translateY(100%);
}
@media (min-width: 720px) {
  .sheet-enter-from .panel,
  .sheet-leave-to .panel {
    transform: translateY(24px) scale(0.98);
    opacity: 0;
  }
}
</style>
