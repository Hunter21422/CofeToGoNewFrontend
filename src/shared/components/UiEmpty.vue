<script setup lang="ts">
defineProps<{ title: string; text?: string }>()
</script>

<template>
  <div class="empty">
    <div v-if="$slots.icon" class="ico"><slot name="icon" /></div>
    <h3 class="t">{{ title }}</h3>
    <p v-if="text" class="x">{{ text }}</p>
    <div v-if="$slots.default" class="act"><slot /></div>
  </div>
</template>

<style scoped>
.empty {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 8px;
  padding: 40px 24px;
}
.ico {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  background: var(--surface-2);
  color: var(--ink-2);
  margin-bottom: 6px;
}
.t {
  font-size: var(--fs-17);
}
.x {
  color: var(--ink-2);
  max-width: 32ch;
}
.act {
  margin-top: 10px;
}
</style>
