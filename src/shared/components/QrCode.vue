<script setup lang="ts">
import QR from 'qrcode'
import { ref, watchEffect } from 'vue'

const props = withDefaults(defineProps<{ value: string; size?: number }>(), { size: 220 })
const svg = ref('')

watchEffect(async () => {
  if (!props.value) return (svg.value = '')
  svg.value = await QR.toString(props.value, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#17231c', light: '#ffffff' },
  })
})
</script>

<template>
  <div class="qr" :style="{ width: size + 'px', height: size + 'px' }" role="img" aria-label="QR-код карты гостя" v-html="svg" />
</template>

<style scoped>
.qr :deep(svg) {
  width: 100%;
  height: 100%;
  shape-rendering: crispEdges;
}
</style>
