import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Опрос раз в N мс, пока вкладка видима. Когда появится WebSocket —
 * заменим на подписку, интерфейс у вызывающих не поменяется.
 */
export function usePolling(fn: () => Promise<unknown> | unknown, ms: number, immediate = true) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const active = ref(false)

  async function run() {
    if (document.visibilityState === 'visible') {
      try {
        await fn()
      } catch {
        /* ошибки показывает сам fn */
      }
    }
    if (active.value) timer = setTimeout(run, ms)
  }
  function start() {
    if (active.value) return
    active.value = true
    if (immediate) run()
    else timer = setTimeout(run, ms)
  }
  function stop() {
    active.value = false
    if (timer) clearTimeout(timer)
  }
  const onVis = () => document.visibilityState === 'visible' && active.value && (stop(), start())

  onMounted(() => {
    start()
    document.addEventListener('visibilitychange', onVis)
  })
  onBeforeUnmount(() => {
    stop()
    document.removeEventListener('visibilitychange', onVis)
  })
  return { start, stop, active }
}

/** Реактивное «сейчас» — для таймеров «ждёт 3 мин» */
export function useNow(ms = 1000) {
  const now = ref(Date.now())
  let t: ReturnType<typeof setInterval>
  onMounted(() => (t = setInterval(() => (now.value = Date.now()), ms)))
  onBeforeUnmount(() => clearInterval(t))
  return now
}
