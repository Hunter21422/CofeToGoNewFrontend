/**
 * Мок-бэкенд: та же маршрутизация и та же форма ответов, что ждёт фронт от FastAPI.
 * Состояние лежит в localStorage — клиент и админка в одном браузере видят одни данные.
 */
import { ApiError, type RequestOptions } from '../http'
import type {
  AdminOrderRead,
  CartItemIn,
  CartQuoteIn,
  CartQuoteOut,
  CustomerListItem,
  DashboardOut,
  KpiOut,
  LocationRead,
  LoyaltyRead,
  OrderCreate,
  OrderRead,
  OrderShort,
  OrderStatus,
  Page,
  ProductAdminRead,
  ProductRead,
  ProductShort,
  StaffRead,
  UserRead,
  UserShort,
} from '../types'
import { ACTIVE_STATUSES } from '../types'
import { createSeed, DB_VERSION, ME_ID, mockHash, type Db, type DbOrder, type DbOrderItem, type DbProduct, type DbUser } from './seed'

const KEY = 'zerno.mockdb'
let db: Db
let memoryOnly = false
// GET-запросы базу не трогают — сохраняем только когда что-то реально поменялось,
// иначе вкладка клиента затирает изменения, которые только что сделал бариста
let dirty = false
const touch = () => (dirty = true)

function load(): Db {
  if (memoryOnly && db) return db
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Db
      if (parsed.version === DB_VERSION) return (db = parsed)
    }
  } catch {
    memoryOnly = true
  }
  db = createSeed()
  save()
  return db
}

function save() {
  if (memoryOnly) return
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    memoryOnly = true
  }
}

export function resetMockDb() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  db = createSeed()
  save()
}

const nextId = (k: string) => (db.seq[k] = (db.seq[k] ?? 0) + 1)
const nowIso = () => new Date().toISOString()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const fail = (status: number, detail: string): never => {
  throw new ApiError(status, detail)
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))
const paginate = <T>(items: T[], q: Record<string, unknown>): Page<T> => {
  const limit = Number(q.limit ?? 20)
  const offset = Number(q.offset ?? 0)
  return { items: items.slice(offset, offset + limit), total: items.length, limit, offset }
}
const arr = (v: unknown): string[] => (v == null ? [] : Array.isArray(v) ? v.map(String) : [String(v)])

// ---------- сериализация ----------
function minutesOf(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function isOpenNow(loc: Db['locations'][number]) {
  const d = new Date()
  const wd = (d.getDay() + 6) % 7
  const h = loc.hours.find((x) => x.weekday === wd)
  if (!h || h.is_closed || !h.opens_at || !h.closes_at) return false
  const m = d.getHours() * 60 + d.getMinutes()
  return m >= minutesOf(h.opens_at) && m < minutesOf(h.closes_at)
}
function locationRead(loc: Db['locations'][number]): LocationRead {
  const { is_active: _a, min_pickup_minutes: _b, max_orders_per_slot: _c, ...rest } = loc
  return { ...clone(rest), is_open_now: isOpenNow(loc) }
}
const locationShort = (id: number) => {
  const l = db.locations.find((x) => x.id === id)!
  return { id: l.id, name: l.name, address: l.address }
}
function userShort(u: DbUser): UserShort {
  return { id: u.id, first_name: u.first_name, last_name: u.last_name, username: u.username, photo_url: u.photo_url }
}
function userRead(u: DbUser): UserRead {
  const st = db.staff.find((s) => s.user_id === u.id && s.is_active)
  const { is_blocked: _b, ...rest } = u
  return { ...clone(rest), role: st?.role ?? null }
}
function loyaltyRead(userId: number): LoyaltyRead {
  const a = db.loyalty.find((l) => l.user_id === userId)!
  const per = db.settings.loyalty.stamps_per_gift
  const tier = a.lifetime_stamps >= 120 ? 'gold' : a.lifetime_stamps >= 40 ? 'silver' : 'base'
  return { ...clone(a), stamps_per_gift: per, stamps_left: Math.max(per - a.stamps, 0), tier } as LoyaltyRead
}

function stockedOut(locId: number) {
  const now = Date.now()
  const active = db.stock.filter((s) => s.location_id === locId && (!s.until || new Date(s.until).getTime() > now))
  return {
    products: new Set(active.map((s) => s.product_id).filter(Boolean) as number[]),
    variants: new Set(active.map((s) => s.variant_id).filter(Boolean) as number[]),
    modifiers: new Set(active.map((s) => s.modifier_id).filter(Boolean) as number[]),
  }
}
function categoryAvailableNow(catId: number) {
  const c = db.categories.find((x) => x.id === catId)!
  if (!c.available_from || !c.available_to) return true
  const d = new Date()
  const m = d.getHours() * 60 + d.getMinutes()
  return m >= minutesOf(c.available_from) && m < minutesOf(c.available_to)
}
function productShort(p: DbProduct, locId: number): ProductShort {
  const out = stockedOut(locId)
  const vs = db.variants.filter((v) => v.product_id === p.id && v.is_active)
  return {
    id: p.id, name: p.name, slug: p.slug, description: p.description, image_url: p.image_url, tags: [...p.tags],
    min_price: vs.length ? Math.min(...vs.map((v) => v.price)) : null,
    is_available: !out.products.has(p.id) && vs.some((v) => !out.variants.has(v.id)) && categoryAvailableNow(p.category_id),
  }
}
function groupsFor(p: DbProduct, locId: number) {
  const out = stockedOut(locId)
  return p.modifier_group_ids
    .map((gid) => db.modifierGroups.find((g) => g.id === gid && g.is_active))
    .filter(Boolean)
    .map((g) => ({
      id: g!.id, name: g!.name, min_select: g!.min_select, max_select: g!.max_select,
      modifiers: g!.modifiers.filter((m) => m.is_active).map((m) => ({
        id: m.id, name: m.name, price_delta: m.price_delta, is_default: m.is_default, is_available: !out.modifiers.has(m.id),
      })),
    }))
}
function productRead(p: DbProduct, locId: number, userId = ME_ID): ProductRead {
  const out = stockedOut(locId)
  return {
    ...productShort(p, locId),
    composition: p.composition, counts_for_loyalty: p.counts_for_loyalty, can_be_gift: p.can_be_gift,
    variants: db.variants.filter((v) => v.product_id === p.id && v.is_active).map((v) => ({
      id: v.id, name: v.name, volume_ml: v.volume_ml, price: v.price, old_price: v.old_price, is_default: v.is_default,
      is_available: !out.variants.has(v.id), calories: v.calories, proteins: v.proteins, fats: v.fats, carbs: v.carbs,
    })),
    modifier_groups: groupsFor(p, locId),
    is_favorite: db.favorites.some((f) => f.user_id === userId && f.product_id === p.id),
  }
}
function productAdmin(p: DbProduct): ProductAdminRead {
  return {
    id: p.id, category_id: p.category_id, name: p.name, slug: p.slug, description: p.description, composition: p.composition,
    image_url: p.image_url, tags: [...p.tags], counts_for_loyalty: p.counts_for_loyalty, can_be_gift: p.can_be_gift,
    sort_order: p.sort_order, is_active: p.is_active, created_at: p.created_at,
    variants: db.variants.filter((v) => v.product_id === p.id).map((v) => ({ ...clone(v), is_available: true })) as ProductAdminRead['variants'],
    modifier_groups: groupsFor(p, 1),
  }
}

const num = (o: DbOrder) => `#${String(o.number).padStart(3, '0')}`
function orderShort(o: DbOrder): OrderShort {
  return {
    id: o.id, display_number: num(o), status: o.status, total: o.total,
    items_count: o.items.reduce((a, i) => a + i.quantity, 0), location: locationShort(o.location_id), created_at: o.created_at,
  }
}
function orderRead(o: DbOrder): OrderRead {
  return {
    id: o.id, display_number: num(o), status: o.status, type: o.type, location: locationShort(o.location_id),
    pickup_at: o.pickup_at, estimated_ready_at: o.estimated_ready_at, comment: o.comment,
    items: clone(o.items).map(({ counts_for_loyalty: _c, ...i }) => i), subtotal: o.subtotal, discount_total: o.discount_total,
    total: o.total, gift_used: o.gift_used, payment_method: o.payment_method, payment_status: o.payment_status,
    payment_url: null, status_history: clone(o.history), can_cancel: o.status === 'new' || o.status === 'pending_payment',
    can_review: o.status === 'completed' && !db.reviews.some((r) => r.order_id === o.id), created_at: o.created_at,
  }
}
function adminOrder(o: DbOrder): AdminOrderRead {
  const u = db.users.find((x) => x.id === o.user_id)!
  const st = o.accepted_by_staff_id ? db.staff.find((s) => s.id === o.accepted_by_staff_id) : null
  const su = st ? db.users.find((x) => x.id === st.user_id)! : null
  return {
    ...orderRead(o), user: userShort(u), source: o.source,
    accepted_by: st && su ? { id: st.id, role: st.role, user: userShort(su) } : null,
    accepted_at: o.accepted_at, ready_at: o.ready_at, completed_at: o.completed_at, cancelled_at: o.cancelled_at,
    cancel_reason: o.cancel_reason, cancelled_by: o.cancelled_by,
  }
}
function staffRead(s: Db['staff'][number]): StaffRead {
  const u = db.users.find((x) => x.id === s.user_id)!
  const locked = s.pin_locked_until && new Date(s.pin_locked_until).getTime() > Date.now() ? s.pin_locked_until : null
  return { id: s.id, role: s.role, user: userShort(u), location_id: s.location_id, is_active: s.is_active, pin_set: !!s.pin_hash,
    pin_locked_until: locked, last_login_at: s.last_login_at, created_at: s.created_at }
}

// ---------- сессия (в моке токен — строка, «.pin» значит второй фактор пройден) ----------
function currentToken(): string | null {
  try {
    return (JSON.parse(sessionStorage.getItem('zerno.tokens') ?? 'null') as { access_token: string } | null)?.access_token ?? null
  } catch {
    return null
  }
}
const tokenPair = (pin: boolean) => ({
  access_token: `mock-access.${Date.now()}${pin ? '.pin' : ''}`, refresh_token: `mock-refresh.${Date.now()}`, token_type: 'bearer', expires_in: 900,
})
function tokenIssuedAt(t: string | null) {
  return Number(t?.split('.')[1] ?? 0)
}
const meStaff = () => db.staff.find((s) => s.user_id === ME_ID)
function requireStaff() {
  const st = meStaff()
  if (!st || !st.is_active) fail(403, 'Вы не в команде этой кофейни')
  const t = currentToken()
  if (st!.tokens_valid_after && tokenIssuedAt(t) < new Date(st!.tokens_valid_after).getTime())
    throw new ApiError(401, 'Сеанс завершён владельцем — войдите заново', 'session_revoked')
  return st!
}
const PIN_MAX_ATTEMPTS = 5
const PIN_LOCK_MIN = 15
const WEAK = new Set(['000000', '111111', '123456', '654321', '121212', '112233', '123123', '999999', '666666', '777777'])

// ---------- лояльность ----------
function loyaltyTx(userId: number, type: string, sd: number, gd: number, orderId: number | null, reason: string | null = null) {
  const a = db.loyalty.find((l) => l.user_id === userId)!
  a.stamps += sd
  a.gifts_available += gd
  if (sd > 0 && type !== 'manual_adjust') a.lifetime_stamps += sd
  if (gd > 0 && type === 'gift_unlocked') a.lifetime_gifts += gd
  const tx = { id: nextId('ltx'), user_id: userId, type, stamps_delta: sd, gifts_delta: gd, stamps_after: a.stamps,
    gifts_after: a.gifts_available, order_id: orderId, reason, created_at: nowIso() }
  db.loyaltyTx.push(tx)
  return tx
}
function addStamps(userId: number, n: number, orderId: number | null) {
  const per = db.settings.loyalty.stamps_per_gift
  let unlocked = false
  let last = null
  for (let i = 0; i < n; i++) {
    last = loyaltyTx(userId, 'stamp_earned', 1, 0, orderId)
    const a = db.loyalty.find((l) => l.user_id === userId)!
    if (a.stamps >= per) {
      last = loyaltyTx(userId, 'gift_unlocked', -per, 1, orderId)
      unlocked = true
    }
  }
  return { tx: last, unlocked }
}

// ---------- заказы ----------
function setStatus(o: DbOrder, to: OrderStatus, comment: string | null = null) {
  if (o.status === to) return
  touch()
  o.history.push({ from_status: o.status, to_status: to, comment, created_at: nowIso() })
  o.status = to
  const t = nowIso()
  if (to === 'accepted') {
    o.accepted_at = t
    o.accepted_by_staff_id = o.accepted_by_staff_id ?? 3
  }
  if (to === 'ready') o.ready_at = t
  if (to === 'completed') {
    o.completed_at = t
    if (!o.loyalty_processed) {
      const n = o.items.filter((i) => i.counts_for_loyalty && !i.is_gift).reduce((a, i) => a + i.quantity, 0)
      if (n) addStamps(o.user_id, n, o.id)
      o.loyalty_processed = true
    }
    if (o.payment_method === 'cash' || o.payment_method === 'card_on_pickup') o.payment_status = 'paid'
  }
  if (to === 'cancelled' || to === 'rejected' || to === 'expired') {
    o.cancelled_at = t
    if (o.gift_used) loyaltyTx(o.user_id, 'gift_returned', 0, 1, o.id, 'Заказ отменён')
    if (o.payment_status === 'paid') o.payment_status = 'refunded'
  }
}

/** Демо-жизнь: свои заказы клиента сами двигаются по статусам, в очередь иногда падают новые */
function tick() {
  const now = Date.now()
  for (const o of db.orders) {
    if (!o.auto_advance || !ACTIVE_STATUSES.includes(o.status)) continue
    const age = (now - new Date(o.created_at).getTime()) / 1000
    if (o.status === 'new' && age > 8) setStatus(o, 'accepted')
    if (o.status === 'accepted' && age > 16) setStatus(o, 'preparing')
    if (o.status === 'preparing' && age > 40) setStatus(o, 'ready')
  }
}
function dayNumber(locId: number) {
  const today = new Date().toDateString()
  return db.orders.filter((o) => o.location_id === locId && new Date(o.created_at).toDateString() === today).length + 1
}
function createDbOrder(userId: number, locId: number, items: DbOrderItem[], extra: Partial<DbOrder>): DbOrder {
  const subtotal = items.reduce((a, i) => a + i.unit_price * i.quantity, 0)
  const total = items.reduce((a, i) => a + i.line_total, 0)
  const loc = db.locations.find((l) => l.id === locId)!
  const o: DbOrder = {
    id: nextId('order'), number: dayNumber(locId), user_id: userId, location_id: locId, status: 'new', type: 'pickup',
    source: 'miniapp', pickup_at: null, estimated_ready_at: new Date(Date.now() + loc.avg_prep_minutes * 60e3).toISOString(),
    comment: null, items, subtotal, discount_total: subtotal - total, total, gift_used: false, promo_code: null,
    payment_method: 'card_online', payment_status: 'paid',
    history: [{ from_status: null, to_status: 'new', comment: null, created_at: nowIso() }],
    accepted_by_staff_id: null, accepted_at: null, ready_at: null, completed_at: null, cancelled_at: null,
    cancel_reason: null, cancelled_by: null, loyalty_processed: false, auto_advance: false, rating: null, created_at: nowIso(),
    ...extra,
  }
  db.orders.push(o)
  return o
}

// ---------- корзина ----------
interface Priced {
  items: (DbOrderItem & { index: number; error: string | null; is_available: boolean; can_be_gift: boolean })[]
}
function priceCart(q: CartQuoteIn, userId: number): { out: CartQuoteOut; priced: Priced } {
  const out = stockedOut(q.location_id)
  const loc = db.locations.find((l) => l.id === q.location_id) ?? fail(404, 'Точка не найдена')
  const warnings: string[] = []
  const priced: Priced = { items: [] }

  q.items.forEach((ci: CartItemIn, index) => {
    const p = db.products.find((x) => x.id === ci.product_id && x.is_active)
    const v = db.variants.find((x) => x.id === ci.variant_id && x.product_id === ci.product_id)
    if (!p || !v) {
      priced.items.push({ id: 0, index, product_id: ci.product_id, product_name: 'Позиция убрана из меню', variant_name: null,
        modifiers: [], unit_price: 0, quantity: ci.quantity, line_total: 0, is_gift: false, counts_for_loyalty: false,
        error: 'Этой позиции больше нет в меню', is_available: false, can_be_gift: false })
      return
    }
    const mods = ci.modifier_ids.map((mid) => {
      const g = db.modifierGroups.find((g) => g.modifiers.some((m) => m.id === mid))!
      const m = g?.modifiers.find((m) => m.id === mid)
      return m ? { id: m.id, group: g.name, name: m.name, price_delta: m.price_delta, out: out.modifiers.has(m.id) } : null
    }).filter(Boolean) as { id: number; group: string; name: string; price_delta: number; out: boolean }[]
    const unit = v.price + mods.reduce((a, m) => a + m.price_delta, 0)
    let error: string | null = null
    if (out.products.has(p.id) || out.variants.has(v.id)) error = 'Закончилось на этой точке'
    else if (mods.some((m) => m.out)) error = `Нет добавки: ${mods.find((m) => m.out)!.name}`
    else if (!categoryAvailableNow(p.category_id)) error = 'Сейчас не готовим'
    priced.items.push({
      id: 0, index, product_id: p.id, product_name: p.name, variant_name: v.name,
      modifiers: mods.map(({ out: _o, ...m }) => m), unit_price: unit, quantity: ci.quantity, line_total: unit * ci.quantity,
      is_gift: false, counts_for_loyalty: p.counts_for_loyalty, error, is_available: !error, can_be_gift: p.can_be_gift,
    })
  })

  const subtotal = priced.items.reduce((a, i) => a + i.line_total, 0)
  const acc = db.loyalty.find((l) => l.user_id === userId)!
  const giftCandidates = priced.items.filter((i) => i.can_be_gift && i.is_available)
  const giftApplicable = acc.gifts_available > 0 && giftCandidates.length > 0
  let giftDiscount = 0
  if (q.use_gift && giftApplicable) {
    // самый дорогой кофе — бесплатно (база напитка, добавки оплачиваются)
    const best = giftCandidates.sort((a, b) => b.unit_price - a.unit_price)[0]
    const v = db.variants.find((x) => x.product_id === best.product_id && x.name === best.variant_name)!
    giftDiscount = v.price
    if (best.quantity > 1) {
      best.quantity -= 1
      best.line_total = best.unit_price * best.quantity
      priced.items.splice(priced.items.indexOf(best) + 1, 0, {
        ...best, quantity: 1, unit_price: best.unit_price, line_total: best.unit_price - v.price, is_gift: true,
      })
    } else {
      best.is_gift = true
      best.line_total = best.unit_price - v.price
    }
  }

  let promoDiscount = 0
  let promoError: string | null = null
  if (q.promo_code) {
    const code = q.promo_code.trim().toUpperCase()
    const promo = db.promos.find((p) => p.code === code)
    const myOrders = db.orders.filter((o) => o.user_id === userId && o.status === 'completed').length
    const base = subtotal - giftDiscount
    if (!promo) promoError = 'Такого промокода нет'
    else if (!promo.is_active || (promo.ends_at && new Date(promo.ends_at) < new Date())) promoError = 'Промокод больше не действует'
    else if (promo.first_order_only && myOrders > 0) promoError = 'Промокод только для первого заказа'
    else if (promo.min_order_total && base < promo.min_order_total) promoError = `Промокод работает от ${promo.min_order_total / 100} ₽`
    else if (promo.location_ids && !promo.location_ids.includes(q.location_id)) promoError = 'На этой точке промокод не действует'
    else if (promo.type === 'percent') promoDiscount = Math.min(Math.round((base * promo.value) / 100), promo.max_discount ?? Infinity)
    else if (promo.type === 'fixed') promoDiscount = Math.min(promo.value, base)
    else if (promo.type === 'free_product') {
      const pv = db.variants.find((v) => v.product_id === promo.product_id)!
      const pp = db.products.find((p) => p.id === promo.product_id)!
      promoDiscount = pv.price
      priced.items.push({ id: 0, index: priced.items.length, product_id: pp.id, product_name: pp.name, variant_name: null, modifiers: [],
        unit_price: pv.price, quantity: 1, line_total: 0, is_gift: true, counts_for_loyalty: false, error: null, is_available: true, can_be_gift: false })
    }
  }

  const discount = giftDiscount + (promoError ? 0 : promoDiscount)
  const promoFreeItemPrice = !promoError && db.promos.find((p) => p.code === q.promo_code?.toUpperCase())?.type === 'free_product' ? promoDiscount : 0
  const fullSubtotal = subtotal + promoFreeItemPrice
  const total = Math.max(fullSubtotal - discount, 0)
  if (!loc.accepts_orders) warnings.push('Точка временно не принимает онлайн-заказы')
  if (!isOpenNow(loc)) warnings.push('Точка сейчас закрыта — выберите время, когда она открыта')
  const stampsToEarn = priced.items.filter((i) => i.counts_for_loyalty && !i.is_gift).reduce((a, i) => a + i.quantity, 0)

  return {
    priced,
    out: {
      items: priced.items.map((i, idx) => ({ index: idx, product_name: i.product_name, variant_name: i.variant_name,
        modifiers: i.modifiers.map((m) => m.name), unit_price: i.unit_price, quantity: i.quantity, line_total: i.line_total,
        is_gift: i.is_gift, is_available: i.is_available, error: i.error })),
      subtotal: fullSubtotal, promo_discount: promoError ? 0 : promoDiscount, gift_discount: giftDiscount, discount_total: discount,
      total, promo_error: promoError, gift_available: acc.gifts_available > 0, gift_applicable: giftApplicable,
      stamps_to_earn: stampsToEarn,
      estimated_ready_at: q.pickup_at ?? new Date(Date.now() + loc.avg_prep_minutes * 60e3).toISOString(),
      warnings, can_checkout: priced.items.every((i) => i.is_available) && loc.accepts_orders && priced.items.length > 0,
    },
  }
}

// ---------- статистика ----------
function dashboard(q: Record<string, unknown>): DashboardOut {
  const from = new Date(String(q.date_from) + 'T00:00:00')
  const to = new Date(String(q.date_to) + 'T23:59:59')
  const loc = q.location_id ? Number(q.location_id) : null
  const groupBy = String(q.group_by ?? 'day')
  const inRange = (o: DbOrder, a: Date, b: Date) => {
    const t = new Date(o.created_at)
    return t >= a && t <= b && (!loc || o.location_id === loc)
  }
  const kpi = (a: Date, b: Date): KpiOut => {
    const all = db.orders.filter((o) => inRange(o, a, b))
    const done = all.filter((o) => o.status === 'completed')
    const revenue = done.reduce((s, o) => s + o.total, 0)
    const firstOrder = new Map<number, string>()
    for (const o of db.orders) if (o.status === 'completed' && (!firstOrder.has(o.user_id) || o.created_at < firstOrder.get(o.user_id)!)) firstOrder.set(o.user_id, o.created_at)
    const usersInRange = new Set(done.map((o) => o.user_id))
    const newC = [...usersInRange].filter((u) => { const f = new Date(firstOrder.get(u)!); return f >= a && f <= b }).length
    const tx = db.loyaltyTx.filter((t) => { const d = new Date(t.created_at); return d >= a && d <= b })
    const prep = done.filter((o) => o.accepted_at && o.ready_at).map((o) => (new Date(o.ready_at!).getTime() - new Date(o.accepted_at!).getTime()) / 1000)
    const revs = db.reviews.filter((r) => { const d = new Date(r.created_at); return d >= a && d <= b && (!loc || r.location_id === loc) })
    return {
      revenue, orders_count: done.length, avg_check: done.length ? Math.round(revenue / done.length) : 0,
      new_customers: newC, returning_customers: usersInRange.size - newC,
      gifts_redeemed: tx.filter((t) => t.type === 'gift_redeemed').length,
      stamps_issued: tx.filter((t) => t.type === 'stamp_earned').length,
      avg_prep_seconds: prep.length ? Math.round(prep.reduce((x, y) => x + y, 0) / prep.length) : 0,
      cancel_rate: all.length ? all.filter((o) => ['cancelled', 'rejected', 'expired'].includes(o.status)).length / all.length : 0,
      avg_rating: revs.length ? revs.reduce((s, r) => s + r.rating, 0) / revs.length : null, prev_period: null,
    }
  }
  const span = to.getTime() - from.getTime()
  const cur = kpi(from, to)
  cur.prev_period = kpi(new Date(from.getTime() - span - 1000), new Date(from.getTime() - 1000))

  const buckets = new Map<string, { revenue: number; orders: number }>()
  const keyOf = (d: Date) => {
    const x = new Date(d)
    if (groupBy === 'hour') x.setMinutes(0, 0, 0)
    else {
      x.setHours(0, 0, 0, 0)
      if (groupBy === 'week') x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
      if (groupBy === 'month') x.setDate(1)
    }
    return x.toISOString()
  }
  // пустые бакеты, чтобы график был непрерывный
  for (let t = new Date(from); t <= to; ) {
    buckets.set(keyOf(t), { revenue: 0, orders: 0 })
    if (groupBy === 'hour') t.setHours(t.getHours() + 1)
    else if (groupBy === 'week') t.setDate(t.getDate() + 7)
    else if (groupBy === 'month') t.setMonth(t.getMonth() + 1)
    else t.setDate(t.getDate() + 1)
  }
  const done = db.orders.filter((o) => inRange(o, from, to) && o.status === 'completed')
  const top = new Map<string, { product_id: number | null; name: string; quantity: number; revenue: number }>()
  const heat = new Map<string, number>()
  const pm: Record<string, number> = {}
  for (const o of done) {
    const k = keyOf(new Date(o.created_at))
    const b = buckets.get(k) ?? { revenue: 0, orders: 0 }
    b.revenue += o.total
    b.orders += 1
    buckets.set(k, b)
    for (const i of o.items) {
      const t = top.get(i.product_name) ?? { product_id: i.product_id, name: i.product_name, quantity: 0, revenue: 0 }
      t.quantity += i.quantity
      t.revenue += i.line_total
      top.set(i.product_name, t)
    }
    const d = new Date(o.created_at)
    const hk = `${(d.getDay() + 6) % 7}-${d.getHours()}`
    heat.set(hk, (heat.get(hk) ?? 0) + 1)
    pm[o.payment_method] = (pm[o.payment_method] ?? 0) + 1
  }
  return {
    kpi: cur,
    series: [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([ts, v]) => ({ ts, ...v })),
    top_products: [...top.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8),
    heatmap: [...heat.entries()].map(([k, orders]) => { const [w, h] = k.split('-').map(Number); return { weekday: w, hour: h, orders } }),
    payment_methods: pm,
  }
}

// ---------- маршруты ----------
type Handler = (p: Record<string, string>, q: Record<string, unknown>, body: any) => unknown
const routes: [string, RegExp, string[], Handler][] = []
function route(method: string, path: string, h: Handler) {
  const keys: string[] = []
  const re = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$')
  routes.push([method, re, keys, h])
}
const me = () => db.users.find((u) => u.id === ME_ID)!

// auth
route('POST', '/auth/telegram', (_p, _q, b) => {
  // если открыто в Telegram — берём имя из initData
  try {
    const user = new URLSearchParams(b?.init_data ?? '').get('user')
    if (user) {
      const tu = JSON.parse(user)
      const u = me()
      u.first_name = tu.first_name ?? u.first_name
      u.last_name = tu.last_name ?? null
      u.username = tu.username ?? u.username
      u.photo_url = tu.photo_url ?? u.photo_url
    }
  } catch {
    /* ignore */
  }
  return tokenPair(false)
})
// refresh второй фактор не сохраняет — после долгого перерыва PIN спросят снова
route('POST', '/auth/refresh', () => tokenPair(false))

// me
route('GET', '/me', () => userRead(me()))
route('PATCH', '/me', (_p, _q, b) => {
  Object.assign(me(), b)
  return userRead(me())
})
route('POST', '/me/phone', (_p, _q, b) => {
  me().phone = b.phone
  return userRead(me())
})
route('GET', '/me/profile', () => {
  const mine = db.orders.filter((o) => o.user_id === ME_ID)
  return {
    user: userRead(me()), loyalty: loyaltyRead(ME_ID), orders_count: mine.filter((o) => o.status === 'completed').length,
    active_orders: mine.filter((o) => ACTIVE_STATUSES.includes(o.status)).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(orderShort),
    favorites_count: db.favorites.filter((f) => f.user_id === ME_ID).length,
  }
})

// точки и меню
route('GET', '/locations', () => db.locations.filter((l) => l.is_active).map(locationRead))
route('GET', '/locations/:id/menu', (p) => {
  const locId = Number(p.id)
  const now = Date.now()
  return {
    location: locationShort(locId),
    categories: db.categories.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order).map((c) => ({
      id: c.id, name: c.name, slug: c.slug, icon: c.icon, image_url: c.image_url,
      products: db.products.filter((x) => x.category_id === c.id && x.is_active).sort((a, b) => a.sort_order - b.sort_order).map((x) => productShort(x, locId)),
    })).filter((c) => c.products.length),
    banners: db.banners.filter((b) => b.is_active && (!b.location_ids || b.location_ids.includes(locId))
      && (!b.starts_at || new Date(b.starts_at).getTime() <= now) && (!b.ends_at || new Date(b.ends_at).getTime() > now))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ id, title, subtitle, image_url, link_type, link_value }) => ({ id, title, subtitle, image_url, link_type, link_value })),
  }
})
route('GET', '/locations/:id/products/:pid', (p) => {
  const prod = db.products.find((x) => x.id === Number(p.pid)) ?? fail(404, 'Товар не найден')
  return productRead(prod, Number(p.id))
})

// корзина / промо
route('POST', '/cart/quote', (_p, _q, b) => priceCart(b, ME_ID).out)
route('POST', '/promo/check', (_p, _q, b) => {
  const promo = db.promos.find((x) => x.code === String(b.code).toUpperCase())
  if (!promo || !promo.is_active) return { valid: false, discount_preview: null, message: 'Промокод не найден или не действует' }
  return { valid: true, discount_preview: promo.type === 'fixed' ? promo.value : null, message: promo.description ?? 'Промокод применён' }
})

// заказы
route('POST', '/orders', (_p, _q, b: OrderCreate) => {
  const { out, priced } = priceCart(b, ME_ID)
  if (!out.can_checkout) fail(409, out.items.find((i) => i.error)?.error ?? out.warnings[0] ?? 'Заказ нельзя оформить')
  const items: DbOrderItem[] = priced.items.map(({ index: _i, error: _e, is_available: _a, can_be_gift: _g, ...i }) => ({ ...i, id: nextId('orderItem') }))
  const online = ['card_online', 'sbp', 'telegram'].includes(b.payment_method)
  const o = createDbOrder(ME_ID, b.location_id, items, {
    type: b.type, comment: b.comment ?? null, pickup_at: b.pickup_at ?? null, payment_method: b.payment_method,
    payment_status: online ? 'paid' : 'unpaid', gift_used: out.gift_discount > 0, promo_code: out.promo_discount ? b.promo_code ?? null : null,
    subtotal: out.subtotal, discount_total: out.discount_total, total: out.total, auto_advance: false,
    estimated_ready_at: out.estimated_ready_at,
  })
  if (o.gift_used) loyaltyTx(ME_ID, 'gift_redeemed', 0, -1, o.id)
  if (o.promo_code) {
    const pr = db.promos.find((x) => x.code === o.promo_code!.toUpperCase())
    if (pr) pr.used_count++
  }
  return { order: orderRead(o), payment_url: null }
})
route('GET', '/orders', (_p, q) => {
  const st = arr(q.status)
  const list = db.orders
    .filter((o) => o.user_id === ME_ID && (!st.length || st.includes(o.status)) && (q.active_only !== 'true' && q.active_only !== true || ACTIVE_STATUSES.includes(o.status)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  return paginate(list.map(orderShort), q)
})
route('GET', '/orders/:id', (p) => {
  const o = db.orders.find((x) => x.id === Number(p.id) && x.user_id === ME_ID) ?? fail(404, 'Заказ не найден')
  return orderRead(o)
})
route('POST', '/orders/:id/cancel', (p, _q, b) => {
  const o = db.orders.find((x) => x.id === Number(p.id) && x.user_id === ME_ID) ?? fail(404, 'Заказ не найден')
  if (!['new', 'pending_payment'].includes(o.status)) fail(409, 'Заказ уже готовят — отменить можно только на кассе')
  o.cancelled_by = 'user'
  o.cancel_reason = b?.reason ?? null
  setStatus(o, 'cancelled')
  return orderRead(o)
})
route('POST', '/orders/:id/review', (p, _q, b) => {
  const o = db.orders.find((x) => x.id === Number(p.id)) ?? fail(404, 'Заказ не найден')
  const r = { id: nextId('review'), order_id: o.id, user_id: ME_ID, location_id: o.location_id, rating: b.rating, comment: b.comment ?? null,
    tags: b.tags ?? [], reply: null, replied_at: null, created_at: nowIso() }
  db.reviews.push(r)
  o.rating = b.rating
  const { user_id: _u, location_id: _l, ...rest } = r
  return rest
})

// лояльность
route('GET', '/loyalty', () => loyaltyRead(ME_ID))
route('GET', '/loyalty/qr', () => {
  // код живёт 5 минут; пока жив — отдаём тот же, чтобы цифры не прыгали
  db.codes = (db.codes ?? []).filter((c) => new Date(c.expires_at).getTime() > Date.now())
  let c = db.codes.find((x) => x.user_id === ME_ID && new Date(x.expires_at).getTime() - Date.now() > 30_000)
  if (!c) {
    let code = ''
    do code = String(Math.floor(100000 + Math.random() * 900000))
    while (db.codes.some((x) => x.code === code))
    c = { user_id: ME_ID, code, token: `ZRN.${ME_ID}.${Math.random().toString(36).slice(2, 10)}`,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString() }
    db.codes.push(c)
    touch()
  }
  const refresh_in = Math.max(5, Math.round((new Date(c.expires_at).getTime() - Date.now()) / 1000) - 30)
  return { token: c.token, code: c.code, expires_at: c.expires_at, refresh_in }
})
route('GET', '/loyalty/history', (_p, q) => {
  const types = arr(q.type)
  const list = db.loyaltyTx.filter((t) => t.user_id === ME_ID && (!types.length || types.includes(t.type))).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
  return paginate(list.map(({ user_id: _u, ...t }) => t), q)
})

// избранное
const favRead = (f: Db['favorites'][number]) => {
  const p = db.products.find((x) => x.id === f.product_id)!
  const pr = productRead(p, me().favorite_location_id ?? 1)
  const v = pr.variants.find((x) => x.id === f.variant_id) ?? pr.variants.find((x) => x.is_default) ?? pr.variants[0]
  const mods = pr.modifier_groups.flatMap((g) => g.modifiers).filter((m) => f.modifier_ids.includes(m.id))
  return { id: f.id, product: productShort(p, 1), variant: v, modifiers: mods, custom_name: f.custom_name,
    price: v.price + mods.reduce((a, m) => a + m.price_delta, 0), is_available: pr.is_available && v.is_available }
}
route('GET', '/favorites', () => db.favorites.filter((f) => f.user_id === ME_ID).map(favRead))
route('POST', '/favorites', (_p, _q, b) => {
  const f = { id: nextId('favorite'), user_id: ME_ID, product_id: b.product_id, variant_id: b.variant_id ?? null,
    modifier_ids: b.modifier_ids ?? [], custom_name: b.custom_name ?? null }
  db.favorites.push(f)
  return favRead(f)
})
route('DELETE', '/favorites/:id', (p) => {
  db.favorites = db.favorites.filter((f) => f.id !== Number(p.id))
})

// ================= ADMIN =================
const A = '/admin'
route('GET', `${A}/me`, () => {
  const st = requireStaff()
  return {
    user: userRead(me()), staff: staffRead(st), locations: db.locations.map((l) => locationShort(l.id)),
    pin_set: !!st.pin_hash, pin_verified: !!currentToken()?.endsWith('.pin'), idle_lock_minutes: 15,
  }
})

// второй фактор
route('POST', `${A}/auth/pin/setup`, (_p, _q, b) => {
  const st = requireStaff()
  if (st.pin_hash) fail(409, 'PIN уже задан. Сбросить его может владелец')
  if (!/^\d{6}$/.test(b.pin)) fail(422, 'PIN — это 6 цифр')
  if (b.pin !== b.pin_repeat) fail(422, 'PIN-коды не совпадают')
  if (WEAK.has(b.pin) || new Set(b.pin).size === 1) fail(422, 'Слишком простой PIN — придумайте другой')
  st.pin_hash = mockHash(b.pin)
  st.last_login_at = nowIso()
  return { ok: true, tokens: tokenPair(true), attempts_left: null, locked_until: null }
})
route('POST', `${A}/auth/pin/verify`, (_p, _q, b) => {
  const st = requireStaff()
  if (!st.pin_hash) fail(409, 'Сначала задайте PIN')
  if (st.pin_locked_until && new Date(st.pin_locked_until).getTime() > Date.now())
    return { ok: false, tokens: null, attempts_left: 0, locked_until: st.pin_locked_until }
  if (mockHash(String(b.pin)) !== st.pin_hash) {
    st.pin_failed_attempts++
    if (st.pin_failed_attempts >= PIN_MAX_ATTEMPTS) {
      st.pin_failed_attempts = 0
      st.pin_locked_until = new Date(Date.now() + PIN_LOCK_MIN * 60e3).toISOString()
      // на бэке: уведомление владельцу в бот + запись в audit_logs
      return { ok: false, tokens: null, attempts_left: 0, locked_until: st.pin_locked_until }
    }
    return { ok: false, tokens: null, attempts_left: PIN_MAX_ATTEMPTS - st.pin_failed_attempts, locked_until: null }
  }
  st.pin_failed_attempts = 0
  st.pin_locked_until = null
  st.last_login_at = nowIso()
  return { ok: true, tokens: tokenPair(true), attempts_left: null, locked_until: null }
})
route('POST', `${A}/auth/lock`, () => {
  requireStaff()
  return tokenPair(false)
})
route('POST', `${A}/auth/logout`, () => null)
route('POST', '/auth/magic', (_p, _q, b) => {
  // на бэке: токен из Redis magic:{token} → user_id, одноразовый, TTL 120 с
  if (!String(b.token).startsWith('demo')) fail(401, 'Ссылка устарела или уже использована. Отправьте боту /admin ещё раз')
  return tokenPair(false)
})

route('GET', `${A}/queue`, (_p, q) => {
  const locId = Number(q.location_id)
  const act = db.orders.filter((o) => o.location_id === locId && ACTIVE_STATUSES.includes(o.status)).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const by = (s: OrderStatus) => act.filter((o) => o.status === s).map(adminOrder)
  return { new: by('new'), accepted: by('accepted'), preparing: by('preparing'), ready: by('ready'), server_time: nowIso() }
})
route('GET', `${A}/orders`, (_p, q) => {
  const st = arr(q.status)
  const qq = String(q.q ?? '').trim().toLowerCase().replace('#', '')
  const from = q.date_from ? new Date(String(q.date_from) + 'T00:00:00') : null
  const to = q.date_to ? new Date(String(q.date_to) + 'T23:59:59') : null
  const list = db.orders.filter((o) => {
    if (q.location_id && o.location_id !== Number(q.location_id)) return false
    if (st.length && !st.includes(o.status)) return false
    if (q.payment_status && o.payment_status !== q.payment_status) return false
    if (q.user_id && o.user_id !== Number(q.user_id)) return false
    const t = new Date(o.created_at)
    if (from && t < from) return false
    if (to && t > to) return false
    if (qq) {
      const u = db.users.find((x) => x.id === o.user_id)!
      const hay = `${String(o.number).padStart(3, '0')} ${u.first_name} ${u.last_name ?? ''} ${u.phone ?? ''} ${u.username ?? ''}`.toLowerCase()
      if (!hay.includes(qq)) return false
    }
    return true
  }).sort((a, b) => b.created_at.localeCompare(a.created_at))
  return paginate(list.map(adminOrder), q)
})
route('GET', `${A}/orders/:id`, (p) => adminOrder(db.orders.find((o) => o.id === Number(p.id)) ?? fail(404, 'Заказ не найден')))
route('PATCH', `${A}/orders/:id/status`, (p, _q, b) => {
  const o = db.orders.find((x) => x.id === Number(p.id)) ?? fail(404, 'Заказ не найден')
  const allowed: Record<string, OrderStatus[]> = {
    new: ['accepted', 'rejected'], accepted: ['preparing', 'ready', 'rejected'], preparing: ['ready'], ready: ['completed'],
    pending_payment: ['cancelled'],
  }
  if (!allowed[o.status]?.includes(b.status)) fail(409, 'Такой переход статуса недоступен')
  o.auto_advance = false
  if (b.estimated_ready_at) o.estimated_ready_at = b.estimated_ready_at
  if (b.status === 'rejected') o.cancelled_by = 'staff'
  setStatus(o, b.status, b.comment ?? null)
  return adminOrder(o)
})
route('POST', `${A}/orders/:id/reject`, (p, _q, b) => {
  const o = db.orders.find((x) => x.id === Number(p.id)) ?? fail(404, 'Заказ не найден')
  o.auto_advance = false
  o.cancelled_by = 'staff'
  o.cancel_reason = b.reason
  setStatus(o, 'rejected', b.reason)
  return adminOrder(o)
})
route('POST', `${A}/orders/:id/refund`, (p, _q, b) => {
  const o = db.orders.find((x) => x.id === Number(p.id)) ?? fail(404, 'Заказ не найден')
  if (o.payment_status !== 'paid') fail(409, 'Возврат возможен только для оплаченного заказа')
  o.payment_status = b.amount && b.amount < o.total ? 'partially_refunded' : 'refunded'
  return adminOrder(o)
})

// касса
const scanResult = (u: DbUser) => {
  if (u.is_blocked) fail(403, 'Гость заблокирован — начислять штампы нельзя')
  return {
    user: userShort(u), phone: u.phone, loyalty: loyaltyRead(u.id),
    last_orders: db.orders.filter((o) => o.user_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map(orderShort),
  }
}
const liveCodes = () => (db.codes ?? []).filter((c) => new Date(c.expires_at).getTime() > Date.now())
route('POST', `${A}/loyalty/scan`, (_p, _q, b) => {
  const c = liveCodes().find((x) => x.token === String(b.token).trim())
  const u = (c && db.users.find((x) => x.id === c.user_id)) || fail(404, 'QR не распознан или устарел — попросите гостя обновить его')
  return scanResult(u)
})
route('POST', `${A}/loyalty/code`, (_p, _q, b) => {
  const code = String(b.code).replace(/\D/g, '')
  if (code.length !== 6) fail(422, 'Код состоит из 6 цифр')
  const c = liveCodes().find((x) => x.code === code)
  const u = (c && db.users.find((x) => x.id === c.user_id)) || fail(404, 'Код неверный или истёк. Попросите гостя открыть карту в приложении — там свежий код.')
  // одноразовый: после проверки сгорает
  db.codes = db.codes.filter((x) => x !== c)
  return scanResult(u)
})
route('GET', `${A}/loyalty/search`, (_p, q) => {
  const raw = String(q.q ?? '').trim().toLowerCase()
  if (raw.length < 2) return []
  const uname = raw.replace(/^@/, '')
  const digits = raw.replace(/\D/g, '')
  return db.users.filter((u) =>
    (u.username && u.username.toLowerCase().includes(uname)) ||
    (digits.length >= 4 && u.phone?.replace(/\D/g, '').includes(digits.replace(/^8/, '7'))) ||
    `${u.first_name} ${u.last_name ?? ''}`.toLowerCase().includes(raw),
  ).slice(0, 8).map((u) => ({ user: userShort(u), phone: u.phone, loyalty: loyaltyRead(u.id) }))
})
route('POST', `${A}/loyalty/stamp`, (_p, _q, b) => {
  const { tx, unlocked } = addStamps(b.user_id, b.count, null)
  const { user_id: _u, ...t } = tx!
  return { loyalty: loyaltyRead(b.user_id), transaction: t, gift_unlocked: unlocked }
})
route('POST', `${A}/loyalty/redeem`, (_p, _q, b) => {
  const a = db.loyalty.find((l) => l.user_id === b.user_id)!
  if (a.gifts_available < 1) fail(409, 'У гостя нет доступных подарков')
  const { user_id: _u, ...t } = loyaltyTx(b.user_id, 'gift_redeemed', 0, -1, null, 'На кассе')
  return { loyalty: loyaltyRead(b.user_id), transaction: t, gift_unlocked: false }
})
route('POST', `${A}/loyalty/adjust`, (_p, _q, b) => {
  const a = db.loyalty.find((l) => l.user_id === b.user_id)!
  if (a.stamps + b.stamps_delta < 0 || a.gifts_available + b.gifts_delta < 0) fail(409, 'Баланс не может уйти в минус')
  const { user_id: _u, ...t } = loyaltyTx(b.user_id, 'manual_adjust', b.stamps_delta, b.gifts_delta, null, b.reason)
  return { loyalty: loyaltyRead(b.user_id), transaction: t, gift_unlocked: false }
})

// категории
route('GET', `${A}/categories`, () => clone(db.categories).sort((a, b) => a.sort_order - b.sort_order))
route('POST', `${A}/categories`, (_p, _q, b) => {
  const c = { id: nextId('category'), icon: null, image_url: null, available_from: null, available_to: null, is_active: true, sort_order: 99, ...b }
  db.categories.push(c)
  return c
})
route('PATCH', `${A}/categories/:id`, (p, _q, b) => Object.assign(db.categories.find((c) => c.id === Number(p.id)) ?? fail(404, 'Нет категории'), b))
route('DELETE', `${A}/categories/:id`, (p) => {
  if (db.products.some((x) => x.category_id === Number(p.id))) fail(409, 'В категории есть товары — сначала перенесите их')
  db.categories = db.categories.filter((c) => c.id !== Number(p.id))
})
route('POST', `${A}/categories/reorder`, (_p, _q, b) => {
  b.ids.forEach((cid: number, i: number) => { const c = db.categories.find((x) => x.id === cid); if (c) c.sort_order = i + 1 })
})

// товары
route('GET', `${A}/products`, (_p, q) => {
  const qq = String(q.q ?? '').toLowerCase()
  const list = db.products.filter((x) => (!q.category_id || x.category_id === Number(q.category_id))
    && (q.is_active === undefined || String(x.is_active) === String(q.is_active)) && (!qq || x.name.toLowerCase().includes(qq)))
    .sort((a, b) => a.category_id - b.category_id || a.sort_order - b.sort_order)
  return paginate(list.map(productAdmin), { limit: 200, ...q })
})
route('GET', `${A}/products/:id`, (p) => productAdmin(db.products.find((x) => x.id === Number(p.id)) ?? fail(404, 'Товар не найден')))
const applyProduct = (prod: DbProduct, b: any) => {
  const { variants, modifier_group_ids, ...rest } = b
  Object.assign(prod, rest)
  if (modifier_group_ids) prod.modifier_group_ids = modifier_group_ids
  if (variants) {
    const keep = new Set<number>()
    for (const v of variants) {
      const ex = v.id ? db.variants.find((x) => x.id === v.id) : null
      if (ex) { Object.assign(ex, v); keep.add(ex.id) }
      else {
        const nv = { product_id: prod.id, volume_ml: null, old_price: null, sku: null, sort_order: 0,
          calories: null, proteins: null, fats: null, carbs: null, ...v, id: nextId('variant') }
        db.variants.push(nv)
        keep.add(nv.id)
      }
    }
    db.variants = db.variants.filter((v) => v.product_id !== prod.id || keep.has(v.id))
  }
}
route('POST', `${A}/products`, (_p, _q, b) => {
  if (db.products.some((x) => x.slug === b.slug)) fail(409, 'Товар с таким slug уже есть')
  const prod: DbProduct = { id: nextId('product'), category_id: b.category_id, name: '', slug: '', description: null, composition: null,
    image_url: null, tags: [], counts_for_loyalty: true, can_be_gift: true, sort_order: 99, is_active: true, modifier_group_ids: [],
    created_at: nowIso() }
  db.products.push(prod)
  applyProduct(prod, b)
  return productAdmin(prod)
})
route('PATCH', `${A}/products/:id`, (p, _q, b) => {
  const prod = db.products.find((x) => x.id === Number(p.id)) ?? fail(404, 'Товар не найден')
  applyProduct(prod, b)
  return productAdmin(prod)
})
route('DELETE', `${A}/products/:id`, (p) => {
  const id = Number(p.id)
  db.products.find((x) => x.id === id) ?? fail(404, 'Товар не найден')
  // старые заказы не ломаются: в них лежит снапшот названия и цены
  db.products = db.products.filter((x) => x.id !== id)
  db.variants = db.variants.filter((v) => v.product_id !== id)
  db.favorites = db.favorites.filter((f) => f.product_id !== id)
  db.stock = db.stock.filter((s) => s.product_id !== id)
})

// модификаторы
route('GET', `${A}/modifier-groups`, () => clone(db.modifierGroups))
const applyGroup = (g: Db['modifierGroups'][number], b: any) => {
  const { modifiers, ...rest } = b
  Object.assign(g, rest)
  if (modifiers) g.modifiers = modifiers.map((m: any, i: number) => ({ is_available: true, ...m, id: m.id ?? nextId('modifier'), sort_order: i }))
}
route('POST', `${A}/modifier-groups`, (_p, _q, b) => {
  const g = { id: nextId('mgroup'), name: '', min_select: 0, max_select: 1, sort_order: 99, is_active: true, modifiers: [] }
  applyGroup(g, b)
  db.modifierGroups.push(g)
  return g
})
route('PATCH', `${A}/modifier-groups/:id`, (p, _q, b) => {
  const g = db.modifierGroups.find((x) => x.id === Number(p.id)) ?? fail(404, 'Группа не найдена')
  applyGroup(g, b)
  return g
})
route('DELETE', `${A}/modifier-groups/:id`, (p) => {
  db.modifierGroups = db.modifierGroups.filter((g) => g.id !== Number(p.id))
  db.products.forEach((x) => (x.modifier_group_ids = x.modifier_group_ids.filter((id) => id !== Number(p.id))))
})

// стоп-лист
const stockRead = (s: Db['stock'][number]) => {
  let title = ''
  if (s.product_id) title = db.products.find((x) => x.id === s.product_id)?.name ?? ''
  if (s.variant_id) { const v = db.variants.find((x) => x.id === s.variant_id); title = `${db.products.find((x) => x.id === v?.product_id)?.name} ${v?.name}` }
  if (s.modifier_id) title = db.modifierGroups.flatMap((g) => g.modifiers.map((m) => ({ ...m, g: g.name }))).find((m) => m.id === s.modifier_id)?.name ?? ''
  return { ...clone(s), title }
}
route('GET', `${A}/locations/:id/stock`, (p) => db.stock.filter((s) => s.location_id === Number(p.id)).map(stockRead))
route('POST', `${A}/locations/:id/stock`, (p, _q, b) => {
  let until = b.until ?? null
  if (b.until_end_of_day) { const d = new Date(); d.setHours(23, 59, 0, 0); until = d.toISOString() }
  const s = { id: nextId('stock'), location_id: Number(p.id), product_id: b.product_id ?? null, variant_id: b.variant_id ?? null,
    modifier_id: b.modifier_id ?? null, until, reason: b.reason ?? null, created_at: nowIso() }
  db.stock.push(s)
  return stockRead(s)
})
route('DELETE', `${A}/locations/:id/stock/:sid`, (p) => {
  db.stock = db.stock.filter((s) => s.id !== Number(p.sid))
})

// клиенты
route('GET', `${A}/customers`, (_p, q) => {
  const qq = String(q.q ?? '').trim().toLowerCase()
  const list: CustomerListItem[] = db.users.filter((u) => {
    if (q.is_blocked !== undefined && String(u.is_blocked) !== String(q.is_blocked)) return false
    if (qq && !`${u.first_name} ${u.last_name ?? ''} ${u.phone ?? ''} ${u.username ?? ''}`.toLowerCase().includes(qq)) return false
    return true
  }).map((u) => {
    const done = db.orders.filter((o) => o.user_id === u.id && o.status === 'completed')
    const last = done.reduce<string | null>((a, o) => (!a || o.created_at > a ? o.created_at : a), null)
    return { id: u.id, first_name: `${u.first_name} ${u.last_name ?? ''}`.trim(), username: u.username, phone: u.phone,
      orders_count: done.length, total_spent: done.reduce((a, o) => a + o.total, 0),
      stamps: db.loyalty.find((l) => l.user_id === u.id)!.stamps, last_order_at: last }
  }).filter((c) => !q.inactive_days || !c.last_order_at || Date.now() - new Date(c.last_order_at).getTime() > Number(q.inactive_days) * 864e5)
    .sort((a, b) => b.total_spent - a.total_spent)
  return paginate(list, q)
})
const customerDetail = (id: number) => {
  const u = db.users.find((x) => x.id === id) ?? fail(404, 'Клиент не найден')
  const mine = db.orders.filter((o) => o.user_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const done = mine.filter((o) => o.status === 'completed')
  return { user: userRead(u), loyalty: loyaltyRead(id), last_orders: mine.slice(0, 8).map(orderShort), orders_count: done.length,
    total_spent: done.reduce((a, o) => a + o.total, 0), is_blocked: u.is_blocked }
}
route('GET', `${A}/customers/:id`, (p) => customerDetail(Number(p.id)))
route('POST', `${A}/customers/:id/block`, (p, _q, b) => {
  const u = db.users.find((x) => x.id === Number(p.id)) ?? fail(404, 'Клиент не найден')
  u.is_blocked = b.is_blocked
  return customerDetail(u.id)
})

// промо
route('GET', `${A}/promo-codes`, (_p, q) => {
  const qq = String(q.q ?? '').toUpperCase()
  return paginate(db.promos.filter((x) => (!qq || x.code.includes(qq)) && (q.is_active === undefined || String(x.is_active) === String(q.is_active)))
    .sort((a, b) => Number(b.is_active) - Number(a.is_active) || b.id - a.id), { limit: 100, ...q })
})
route('POST', `${A}/promo-codes`, (_p, _q, b) => {
  const code = String(b.code).toUpperCase()
  if (db.promos.some((x) => x.code === code)) fail(409, 'Такой промокод уже есть')
  const pr = { id: nextId('promo'), used_count: 0, is_active: true, created_at: nowIso(), product_id: null, min_order_total: null,
    max_discount: null, starts_at: null, ends_at: null, usage_limit_total: null, usage_limit_per_user: 1, first_order_only: false,
    location_ids: null, description: null, ...b, code }
  db.promos.push(pr)
  return pr
})
route('PATCH', `${A}/promo-codes/:id`, (p, _q, b) => Object.assign(db.promos.find((x) => x.id === Number(p.id)) ?? fail(404, 'Нет промокода'), b))

// баннеры и рассылки
route('GET', `${A}/banners`, () => clone(db.banners).sort((a, b) => a.sort_order - b.sort_order))
route('POST', `${A}/banners`, (_p, _q, b) => {
  const bn = { id: nextId('banner'), is_active: true, ...b }
  db.banners.push(bn)
  return bn
})
route('PATCH', `${A}/banners/:id`, (p, _q, b) => Object.assign(db.banners.find((x) => x.id === Number(p.id)) ?? fail(404, 'Нет баннера'), b))
route('DELETE', `${A}/banners/:id`, (p) => { db.banners = db.banners.filter((x) => x.id !== Number(p.id)) })
const segmentCount = (s: any) => db.users.filter((u) => {
  if (s.only_marketing_consent && !u.marketing_consent) return false
  const done = db.orders.filter((o) => o.user_id === u.id && o.status === 'completed')
  const last = done.reduce((a, o) => Math.max(a, new Date(o.created_at).getTime()), 0)
  if (s.inactive_days && last && Date.now() - last < s.inactive_days * 864e5) return false
  if (s.active_days && (!last || Date.now() - last > s.active_days * 864e5)) return false
  if (s.min_orders && done.length < s.min_orders) return false
  const acc = db.loyalty.find((l) => l.user_id === u.id)!
  if (s.stamps_gte != null && acc.stamps < s.stamps_gte) return false
  if (s.has_gift != null && (acc.gifts_available > 0) !== s.has_gift) return false
  if (s.birthday_month && (!u.birth_date || Number(u.birth_date.slice(5, 7)) !== s.birthday_month)) return false
  if (s.location_ids?.length && !done.some((o) => s.location_ids.includes(o.location_id))) return false
  return true
}).length * 37 // демо: в базе 36 человек, умножаем, чтобы цифры выглядели как у живой кофейни
route('GET', `${A}/broadcasts`, () => clone(db.broadcasts).sort((a, b) => b.id - a.id))
route('POST', `${A}/broadcasts`, (_p, _q, b) => {
  const br = { id: nextId('broadcast'), status: b.scheduled_at ? 'scheduled' : 'draft', started_at: null, finished_at: null,
    total_count: 0, sent_count: 0, failed_count: 0, created_at: nowIso(), image_url: null, button_text: null, button_url: null, scheduled_at: null, ...b }
  db.broadcasts.push(br)
  return br
})
route('POST', `${A}/broadcasts/segment-preview`, (_p, _q, b) => ({ count: segmentCount(b) }))
route('POST', `${A}/broadcasts/:id/send`, (p) => {
  const br = db.broadcasts.find((x) => x.id === Number(p.id)) ?? fail(404, 'Нет рассылки')
  const n = segmentCount(br.segment)
  Object.assign(br, { status: 'done', started_at: nowIso(), finished_at: nowIso(), total_count: n, sent_count: Math.round(n * 0.97), failed_count: n - Math.round(n * 0.97) })
  return br
})

// статистика
route('GET', `${A}/stats/dashboard`, (_p, q) => dashboard(q))

// отзывы
const reviewAdmin = (r: Db['reviews'][number]) => {
  const o = db.orders.find((x) => x.id === r.order_id)
  const { user_id, location_id, ...rest } = r
  return { ...clone(rest), user: userShort(db.users.find((u) => u.id === user_id)!), location: locationShort(location_id),
    order_number: o ? num(o) : '' }
}
route('GET', `${A}/reviews`, (_p, q) => {
  const ratings = arr(q.rating).map(Number)
  const list = db.reviews.filter((r) => (!q.location_id || r.location_id === Number(q.location_id)) && (!ratings.length || ratings.includes(r.rating))
    && (q.has_reply === undefined || String(!!r.reply) === String(q.has_reply))).sort((a, b) => b.created_at.localeCompare(a.created_at))
  return paginate(list.map(reviewAdmin), q)
})
route('POST', `${A}/reviews/:id/reply`, (p, _q, b) => {
  const r = db.reviews.find((x) => x.id === Number(p.id)) ?? fail(404, 'Нет отзыва')
  r.reply = b.reply
  r.replied_at = nowIso()
  return reviewAdmin(r)
})

// персонал
route('GET', `${A}/staff`, () => db.staff.map(staffRead))
route('POST', `${A}/staff`, (_p, _q, b) => {
  const u = db.users.find((x) => x.tg_id === Number(b.tg_id)) ?? fail(404, 'Пользователь с таким Telegram ID ещё не открывал приложение')
  if (db.staff.some((s) => s.user_id === u.id)) fail(409, 'Этот человек уже в команде')
  if (meStaff()?.role !== 'owner') fail(403, 'Добавлять сотрудников может только владелец')
  const s = { id: nextId('staff'), user_id: u.id, role: b.role, location_id: b.location_id, is_active: true, created_by_id: ME_ID,
    pin_hash: null, pin_failed_attempts: 0, pin_locked_until: null, tokens_valid_after: null, last_login_at: null, created_at: nowIso() }
  db.staff.push(s)
  return staffRead(s)
})
route('POST', `${A}/staff/:id/reset-pin`, (p) => {
  if (meStaff()?.role !== 'owner') fail(403, 'Сбросить PIN может только владелец')
  const s = db.staff.find((x) => x.id === Number(p.id)) ?? fail(404, 'Нет сотрудника')
  Object.assign(s, { pin_hash: null, pin_failed_attempts: 0, pin_locked_until: null, tokens_valid_after: nowIso() })
  return staffRead(s)
})
route('POST', `${A}/staff/:id/revoke`, (p) => {
  if (meStaff()?.role !== 'owner') fail(403, 'Завершать сеансы может только владелец')
  const s = db.staff.find((x) => x.id === Number(p.id)) ?? fail(404, 'Нет сотрудника')
  s.tokens_valid_after = nowIso()
  return staffRead(s)
})
route('PATCH', `${A}/staff/:id`, (p, _q, b) => staffRead(Object.assign(db.staff.find((s) => s.id === Number(p.id)) ?? fail(404, 'Нет сотрудника'), b)))

// точки
route('GET', `${A}/locations`, () => db.locations.map(locationRead))
route('PATCH', `${A}/locations/:id`, (p, _q, b) => locationRead(Object.assign(db.locations.find((l) => l.id === Number(p.id)) ?? fail(404, 'Нет точки'), b)))
route('PUT', `${A}/locations/:id/hours`, (p, _q, b) => {
  const l = db.locations.find((x) => x.id === Number(p.id)) ?? fail(404, 'Нет точки')
  l.hours = b.hours
  return locationRead(l)
})

// настройки
route('GET', `${A}/settings`, () => clone(db.settings))
route('PATCH', `${A}/settings`, (_p, _q, b) => {
  for (const k of ['loyalty', 'orders', 'texts'] as const) if (b[k]) Object.assign(db.settings[k], b[k])
  return clone(db.settings)
})

// ---------- вход ----------
export async function mockRequest<T>(method: string, path: string, opts: RequestOptions): Promise<T> {
  await sleep(method === 'GET' ? 120 + Math.random() * 180 : 220 + Math.random() * 260)
  load()
  dirty = false
  tick()
  const tickDirty = dirty
  const clean = path.split('?')[0]
  // все /admin/* кроме /admin/me и /admin/auth/* требуют пройденный PIN
  if (clean.startsWith('/admin/') && clean !== '/admin/me' && !clean.startsWith('/admin/auth/')) {
    requireStaff()
    if (!currentToken()?.endsWith('.pin')) throw new ApiError(403, 'Введите PIN, чтобы продолжить', 'pin_required')
  }
  for (const [m, re, keys, h] of routes) {
    if (m !== method) continue
    const match = clean.match(re)
    if (!match) continue
    const params: Record<string, string> = {}
    keys.forEach((k, i) => (params[k] = decodeURIComponent(match[i + 1])))
    dirty = tickDirty || method !== 'GET'
    const result = h(params, (opts.query ?? {}) as Record<string, unknown>, opts.body)
    if (dirty) save()
    return clone(result ?? null) as T
  }
  throw new ApiError(404, `Mock: нет обработчика ${method} ${clean}`)
}

// дебаг из консоли: window.__zernoReset()
;(globalThis as Record<string, unknown>).__zernoReset = () => { resetMockDb(); location.reload() }
