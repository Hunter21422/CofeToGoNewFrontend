import { ref } from 'vue'
import { http } from '@/shared/api/http'
import raw from './docs.json'

export type DocKey = 'policy' | 'consent' | 'ads' | 'terms' | 'loyalty'
export type Block = [string, ...unknown[]]

export interface LegalOut {
  ready: boolean
  operator: string
  email: string | null
  docs_date: string | null
  per_gift: number
  stamps_expire_days: number | null
  gift_expire_days: number | null
  gift_with_modifiers: boolean
  birthday_gift: boolean
  pickup_minutes: number
  deal_soda: boolean
}

export const DOCS: Record<DocKey, string> = {
  policy: 'Политика обработки персональных данных',
  consent: 'Согласие на обработку персональных данных',
  ads: 'Согласие на получение рассылок',
  terms: 'Пользовательское соглашение',
  loyalty: 'Правила программы лояльности',
}

const legal = ref<LegalOut | null>(null)
let loading: Promise<LegalOut> | null = null

export function useLegal() {
  if (!loading) loading = http.get<LegalOut>('/legal').then((v) => (legal.value = v)).catch((e) => {
    loading = null
    throw e
  })
  return { legal, ready: loading }
}

function days(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'день'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дня'
  return 'дней'
}

function fill(text: string, l: LegalOut): string {
  return text
    .replaceAll('{{OP}}', l.operator)
    .replaceAll('{{DATE}}', l.docs_date || 'даты публикации в сервисе')
    .replaceAll('{{PICKUP}}', String(l.pickup_minutes))
    .replaceAll('{{PER_GIFT}}', String(l.per_gift))
    .replaceAll('{{NEXT}}', String(l.per_gift + 1))
    .replaceAll('{{GIFT_MODS}}', l.gift_with_modifiers ? 'Добавки (сиропы, альтернативное молоко) к подарочному напитку тоже бесплатны.' : 'Добавки (сиропы, альтернативное молоко) к подарочному напитку оплачиваются отдельно.')
    .replaceAll('{{STAMPS_EXPIRE}}', l.stamps_expire_days ? `4.1. Штампы сгорают, если гость не делает заказов **${l.stamps_expire_days} ${days(l.stamps_expire_days)}** подряд. Любой заказ продлевает срок.` : '4.1. Штампы не сгорают.')
    .replaceAll('{{GIFT_EXPIRE}}', l.gift_expire_days ? `4.2. Подарок сгорает, если гость не делает заказов и не использует подарок **${l.gift_expire_days} ${days(l.gift_expire_days)}** подряд.` : '4.2. Подарок не сгорает.')
}

function dropSection(blocks: Block[], startsWith: string): Block[] {
  const i = blocks.findIndex((b) => b[0] === 'h' && String(b[1]).startsWith(startsWith))
  if (i < 0) return blocks
  let j = i + 1
  while (j < blocks.length && blocks[j][0] !== 'h') j++
  return [...blocks.slice(0, i), ...blocks.slice(j)]
}

export function docBlocks(key: DocKey, l: LegalOut): Block[] {
  let blocks = (raw as Record<DocKey, Block[]>)[key]
  if (key === 'loyalty') {
    if (!l.birthday_gift) blocks = dropSection(blocks, '5.')
    if (!l.deal_soda) blocks = dropSection(blocks, '6.')
  }
  return blocks.map((b) => b.map((x) => (typeof x === 'string' ? fill(x, l) : Array.isArray(x) ? x.map((row) => (Array.isArray(row) ? row.map((c) => (typeof c === 'string' ? fill(c, l) : c)) : row)) : x)) as Block)
}
