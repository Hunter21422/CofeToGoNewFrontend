import { onBeforeUnmount, onMounted } from 'vue'

/** Через N минут без касаний и клавиш вызывает onIdle (панель просит PIN снова) */
export function useIdleLock(minutes: () => number, onIdle: () => void) {
  let last = Date.now()
  let timer: ReturnType<typeof setInterval>
  const bump = () => (last = Date.now())
  const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

  onMounted(() => {
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    timer = setInterval(() => {
      if (Date.now() - last > minutes() * 60_000) {
        bump()
        onIdle()
      }
    }, 15_000)
  })
  onBeforeUnmount(() => {
    events.forEach((e) => window.removeEventListener(e, bump))
    clearInterval(timer)
  })
}
