/* Стартовые данные мок-бэкенда. Цены в копейках. */
import type {
  BannerAdminRead,
  BroadcastRead,
  CategoryAdminRead,
  LocationRead,
  ModifierGroupAdminRead,
  OrderStatus,
  PaymentMethod,
  PromoCodeRead,
  SettingsOut,
  StaffRole,
} from '../types'

export interface DbVariant {
  id: number
  product_id: number
  name: string
  volume_ml: number | null
  price: number
  old_price: number | null
  sku: string | null
  is_default: boolean
  sort_order: number
  is_active: boolean
  calories: number | null
  proteins: number | null
  fats: number | null
  carbs: number | null
}
export interface DbProduct {
  id: number
  category_id: number
  name: string
  slug: string
  description: string | null
  composition: string | null
  image_url: string | null
  tags: string[]
  counts_for_loyalty: boolean
  can_be_gift: boolean
  sort_order: number
  is_active: boolean
  modifier_group_ids: number[]
  created_at: string
}
export interface DbUser {
  id: number
  tg_id: number
  first_name: string
  last_name: string | null
  username: string | null
  photo_url: string | null
  phone: string | null
  email: string | null
  birth_date: string | null
  language_code: string
  favorite_location_id: number | null
  referral_code: string
  marketing_consent: boolean
  notifications_enabled: boolean
  is_blocked: boolean
  created_at: string
}
export interface DbLoyalty {
  user_id: number
  stamps: number
  gifts_available: number
  lifetime_stamps: number
  lifetime_gifts: number
}
export interface DbLoyaltyTx {
  id: number
  user_id: number
  type: string
  stamps_delta: number
  gifts_delta: number
  stamps_after: number
  gifts_after: number
  order_id: number | null
  reason: string | null
  created_at: string
}
export interface DbOrderItem {
  id: number
  product_id: number | null
  product_name: string
  variant_name: string | null
  modifiers: { id: number; group: string; name: string; price_delta: number }[]
  unit_price: number
  quantity: number
  line_total: number
  is_gift: boolean
  counts_for_loyalty: boolean
}
export interface DbOrder {
  id: number
  number: number
  user_id: number
  location_id: number
  status: OrderStatus
  type: 'pickup' | 'dine_in'
  source: 'miniapp' | 'pos' | 'admin'
  pickup_at: string | null
  estimated_ready_at: string | null
  comment: string | null
  items: DbOrderItem[]
  subtotal: number
  discount_total: number
  total: number
  gift_used: boolean
  promo_code: string | null
  payment_method: PaymentMethod
  payment_status: 'unpaid' | 'pending' | 'paid' | 'refunded' | 'partially_refunded'
  history: { from_status: OrderStatus | null; to_status: OrderStatus; comment: string | null; created_at: string }[]
  accepted_by_staff_id: number | null
  accepted_at: string | null
  ready_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  cancelled_by: 'user' | 'staff' | 'system' | null
  loyalty_processed: boolean
  auto_advance: boolean
  rating: number | null
  created_at: string
}
export interface DbReview {
  id: number
  order_id: number
  user_id: number
  location_id: number
  rating: number
  comment: string | null
  tags: string[]
  reply: string | null
  replied_at: string | null
  created_at: string
}
export interface DbStaff {
  id: number
  user_id: number
  role: StaffRole
  location_id: number | null
  is_active: boolean
  created_by_id: number | null
  pin_hash: string | null
  pin_failed_attempts: number
  pin_locked_until: string | null
  tokens_valid_after: string | null
  last_login_at: string | null
  created_at: string
}

/** Мок-«хеш». На бэке — argon2/bcrypt, здесь лишь бы PIN не лежал в открытую */
export function mockHash(pin: string) {
  let h = 5381
  for (const c of `zerno:${pin}`) h = ((h << 5) + h + c.charCodeAt(0)) | 0
  return `mock$${(h >>> 0).toString(16)}`
}
export interface DbFavorite {
  id: number
  user_id: number
  product_id: number
  variant_id: number | null
  modifier_ids: number[]
  custom_name: string | null
}
export interface DbStock {
  id: number
  location_id: number
  product_id: number | null
  variant_id: number | null
  modifier_id: number | null
  until: string | null
  reason: string | null
  created_at: string
}

export interface Db {
  version: number
  seq: Record<string, number>
  locations: (Omit<LocationRead, 'is_open_now'> & { is_active: boolean; min_pickup_minutes: number; max_orders_per_slot: number | null })[]
  categories: CategoryAdminRead[]
  products: DbProduct[]
  variants: DbVariant[]
  modifierGroups: ModifierGroupAdminRead[]
  users: DbUser[]
  loyalty: DbLoyalty[]
  loyaltyTx: DbLoyaltyTx[]
  orders: DbOrder[]
  reviews: DbReview[]
  staff: DbStaff[]
  favorites: DbFavorite[]
  stock: DbStock[]
  promos: PromoCodeRead[]
  banners: BannerAdminRead[]
  broadcasts: BroadcastRead[]
  settings: SettingsOut
  lastIncomingAt: number
  codes: { user_id: number; code: string; token: string; expires_at: string }[]
}

export const DB_VERSION = 10
export const ME_ID = 1

const iso = (d: Date) => d.toISOString()

export function createSeed(): Db {
  const now = new Date()
  const seq: Record<string, number> = {}
  const id = (k: string) => (seq[k] = (seq[k] ?? 0) + 1)

  // ---------- точка ----------
  const hours = Array.from({ length: 7 }, (_, i) => ({ weekday: i, opens_at: '08:00', closes_at: '22:00', is_closed: false }))
  const locations: Db['locations'] = [
    {
      id: id('location'), name: 'Кофе с тобой', slug: 'main', address: '',
      lat: null, lng: null, phone: null, photo_url: null, timezone: 'Europe/Moscow',
      accepts_orders: true, payment_methods: ['card_online', 'sbp', 'card_on_pickup', 'cash'],
      avg_prep_minutes: 7, hours, is_active: true, min_pickup_minutes: 5, max_orders_per_slot: null,
    },
  ]

  // ---------- модификаторы ----------
  const mg = (name: string, min: number, max: number, mods: [string, number, boolean?][]): ModifierGroupAdminRead => {
    const gid = id('mgroup')
    return {
      id: gid, name, min_select: min, max_select: max, sort_order: gid, is_active: true,
      modifiers: mods.map(([n, p, d], i) => ({
        id: id('modifier'), name: n, price_delta: p, is_default: !!d, is_available: true, sort_order: i, is_active: true,
      })),
    }
  }
  // Молоко для молочных напитков — выбрать обязательно
  const MILK = mg('Молоко', 1, 1, [['Обычное', 0, true], ['Овсяное', 6000], ['Миндальное', 7000], ['Кокосовое', 7000], ['Безлактозное', 4000]])
  const SYRUP = mg('Сироп', 0, 2, [['Ваниль', 4000], ['Карамель', 4000], ['Солёная карамель', 5000], ['Лесной орех', 4000], ['Кокос', 4000], ['Лаванда', 5000]])
  const SHOT = mg('Покрепче', 0, 1, [['Дополнительный шот', 6000]])
  const TEMP = mg('Температура', 0, 1, [['Погорячее', 0], ['Потеплее', 0]])
  const SUGAR = mg('Сахар', 0, 1, [['Сахар', 0], ['Сахарозаменитель', 0]])
  // Для чёрного кофе молоко по желанию
  const MILK_ADD = mg('Добавить молоко', 0, 1, [['Обычное', 3000], ['Овсяное', 6000], ['Миндальное', 7000], ['Сливки', 5000]])
  const TOPPING = mg('Топпинг', 0, 2, [['Взбитые сливки', 5000], ['Шоколадная крошка', 4000], ['Маршмеллоу', 4000], ['Карамельный соус', 4000]])
  const TEA_ADD = mg('Добавить в чай', 0, 2, [['Лимон', 2000], ['Мёд', 4000], ['Мята', 2000], ['Имбирь', 3000]])
  const ICE = mg('Лёд', 1, 1, [['Со льдом', 0, true], ['Без льда', 0], ['Побольше льда', 0]])
  const modifierGroups = [MILK, SYRUP, SHOT, TEMP, SUGAR, MILK_ADD, TOPPING, TEA_ADD, ICE]

  // ---------- категории ----------
  const cat = (name: string, slug: string, icon: string, from: string | null = null, to: string | null = null): CategoryAdminRead => {
    const cid = id('category')
    return { id: cid, name, slug, icon, image_url: null, sort_order: cid, available_from: from, available_to: to, is_active: true }
  }
  const C_COFFEE = cat('Кофе', 'coffee', '☕')
  const C_TEA = cat('Чай', 'tea', '🍵')
  const C_LEMONADE = cat('Лимонады', 'lemonades', '🍋')
  const C_JUICE = cat('Соки', 'juices', '🍊')
  const C_SHAKE = cat('Молочные коктейли', 'milkshakes', '🥤')
  const C_DESSERT = cat('Десерты', 'desserts', '🍰')
  const categories = [C_COFFEE, C_TEA, C_LEMONADE, C_JUICE, C_SHAKE, C_DESSERT]

  // ---------- вы: гость и владелец ----------
  const users: DbUser[] = [{
    id: id('user'), tg_id: 100000001, first_name: 'Гость', last_name: null, username: null, photo_url: null,
    phone: null, email: null, birth_date: null, language_code: 'ru', favorite_location_id: 1, referral_code: 'KST0001',
    marketing_consent: false, notifications_enabled: true, is_blocked: false, created_at: iso(now),
  }]
  const staff: DbStaff[] = [{
    id: id('staff'), user_id: 1, role: 'owner', location_id: null, is_active: true, created_by_id: null,
    pin_hash: null, pin_failed_attempts: 0, pin_locked_until: null, tokens_valid_after: null, last_login_at: null, created_at: iso(now),
  }]
  const loyalty: DbLoyalty[] = [{ user_id: 1, stamps: 0, gifts_available: 0, lifetime_stamps: 0, lifetime_gifts: 0 }]

  const settings: SettingsOut = {
    loyalty: { stamps_per_gift: 5, stamps_expire_days: null, gift_expire_days: 90, birthday_gift: true, referral_stamps: 1 },
    orders: { payment_timeout_min: 15, accept_timeout_min: 5, max_items_per_order: 30 },
    texts: {
      order_accepted: 'Заказ {number} принят, уже готовим',
      order_ready: 'Заказ {number} готов — заберите на стойке',
      order_cancelled: 'Заказ {number} отменён',
      gift_unlocked: 'Пятый штамп! Следующий напиток за наш счёт',
    },
  }

  return {
    version: DB_VERSION, seq, locations, categories, products: [], variants: [], modifierGroups, users, loyalty, loyaltyTx: [],
    orders: [], reviews: [], staff, favorites: [], stock: [], promos: [], banners: [], broadcasts: [], settings,
    lastIncomingAt: Date.now(), codes: [],
  }
}
