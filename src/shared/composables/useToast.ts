import { ref } from 'vue'
import { ApiError } from '../api/http'

export interface Toast {
  id: number
  text: string
  tone: 'ok' | 'error' | 'info'
}

export const toasts = ref<Toast[]>([])
let seq = 0

export function toast(text: string, tone: Toast['tone'] = 'info', ms = 3200) {
  const id = ++seq
  toasts.value = [...toasts.value.slice(-2), { id, text, tone }]
  setTimeout(() => dismiss(id), ms)
}
export function dismiss(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}
export function toastError(e: unknown, fallback = 'Не получилось. Попробуйте ещё раз.') {
  toast(e instanceof ApiError ? e.message : fallback, 'error', 4200)
}
