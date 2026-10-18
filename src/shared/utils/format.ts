import type { LoyaltyTxType, OrderStatus, PaymentMethod, StaffRole } from '../api/types'

const rub = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

/** 26000 → «260 ₽» */
export function money(kop: number | null | undefined): string {
  if (kop == null) return '—'
  const r = kop / 100
  return `${rub.format(Number.isInteger(r) ? r : Math.round(r * 100) / 100)} ₽`
}

/** Только число рублей, для крупных цифр */
export function rubles(kop: number): string {
  return rub.format(Math.round(kop / 100))
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

export function time(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function date(iso: string | null | undefined, withYear = false): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) })
}

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

/** «сегодня, 14:05» / «вчера, 9:12» / «3 октября, 18:40» */
export function when(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const y = new Date()
  y.setDate(today.getDate() - 1)
  const t = time(iso)
  if (d.toDateString() === today.toDateString()) return `сегодня, ${t}`
  if (d.toDateString() === y.toDateString()) return `вчера, ${t}`
  return `${date(iso, d.getFullYear() !== today.getFullYear())}, ${t}`
}

/** Сколько прошло: «3 мин», «1 ч 05 мин» */
export function elapsed(fromIso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 1000))
  if (s < 60) return `${s} с`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} мин`
  return `${Math.floor(m / 60)} ч ${String(m % 60).padStart(2, '0')} мин`
}

export function minutesUntil(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null
  return Math.round((new Date(iso).getTime() - now) / 60000)
}

export function phone(p: string | null | undefined): string {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  if (d.length !== 11) return p
  return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Ждёт оплаты',
  new: 'Отправлен',
  accepted: 'Принят',
  preparing: 'Готовим',
  ready: 'Готов',
  completed: 'Выдан',
  cancelled: 'Отменён',
  rejected: 'Отклонён',
  expired: 'Не оплачен',
}

export const STATUS_TONE: Record<OrderStatus, 'neutral' | 'info' | 'warn' | 'ok' | 'danger' | 'primary'> = {
  pending_payment: 'warn',
  new: 'info',
  accepted: 'primary',
  preparing: 'warn',
  ready: 'ok',
  completed: 'neutral',
  cancelled: 'danger',
  rejected: 'danger',
  expired: 'danger',
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  card_online: 'Картой онлайн',
  sbp: 'СБП',
  telegram: 'Telegram Pay',
  cash: 'Наличными на месте',
  card_on_pickup: 'Картой на месте',
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  barista: 'Бариста',
  manager: 'Управляющий',
  owner: 'Владелец',
}

export const TX_LABEL: Record<LoyaltyTxType, string> = {
  stamp_earned: 'Штамп за напиток',
  gift_unlocked: 'Открыт подарок',
  gift_redeemed: 'Подарок получен',
  gift_returned: 'Подарок вернули',
  manual_adjust: 'Корректировка',
  birthday: 'Подарок на день рождения',
  referral: 'Бонус за друга',
  expired: 'Сгорели',
}

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export const WEEKDAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

export function initials(first: string, last?: string | null) {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?'
}

export function todayIso(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
