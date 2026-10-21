/**
 * Типы 1-в-1 с backend/app/schemas. Деньги — в копейках (number).
 * Даты — ISO-строки.
 */

// ---------- enums ----------
export type StaffRole = 'barista' | 'manager' | 'owner'
export type OrderStatus =
  | 'pending_payment'
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'expired'
export type OrderType = 'pickup' | 'dine_in'
export type OrderSource = 'miniapp' | 'pos' | 'admin'
export type CancelledBy = 'user' | 'staff' | 'system'
export type PaymentMethod = 'card_online' | 'sbp' | 'telegram' | 'cash' | 'card_on_pickup'
export type OrderPaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded' | 'partially_refunded'
export type LoyaltyTier = 'base' | 'silver' | 'gold'
export type LoyaltyTxType =
  | 'stamp_earned'
  | 'gift_unlocked'
  | 'gift_redeemed'
  | 'gift_returned'
  | 'manual_adjust'
  | 'birthday'
  | 'referral'
  | 'expired'
export type PromoType = 'percent' | 'fixed' | 'free_product'
export type BannerLinkType = 'none' | 'product' | 'category' | 'url'
export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'done' | 'cancelled'

export const ACTIVE_STATUSES: OrderStatus[] = ['new', 'accepted', 'preparing', 'ready']

// ---------- common ----------
export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}
export interface Pagination {
  limit?: number
  offset?: number
}

// ---------- auth ----------
export interface SmsSendOut {
  /** через сколько секунд код протухнет */
  expires_in: number
  /** через сколько секунд можно запросить снова */
  resend_in: number
  /** call: робот звонит, код = последние 4 цифры номера */
  channel?: 'call' | 'sms' | 'log'
  /** только в моке: код, который «пришёл» в SMS */
}
/** То, что отдаёт Telegram Login Widget (https://core.telegram.org/widgets/login) */
export interface TelegramWidgetUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}
export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

// ---------- user ----------
export interface UserShort {
  id: number
  first_name: string
  last_name: string | null
  username: string | null
  photo_url: string | null
}
export interface UserRead extends UserShort {
  tg_id: number
  phone: string | null
  email: string | null
  birth_date: string | null
  language_code: string
  favorite_location_id: number | null
  referral_code: string
  marketing_consent: boolean
  notifications_enabled: boolean
  role: StaffRole | null
  created_at: string
}
export type UserUpdate = Partial<
  Pick<
    UserRead,
    | 'first_name'
    | 'last_name'
    | 'email'
    | 'birth_date'
    | 'favorite_location_id'
    | 'marketing_consent'
    | 'notifications_enabled'
    | 'language_code'
  >
>
export interface CustomerFilter extends Pagination {
  q?: string
  location_id?: number
  inactive_days?: number
  is_blocked?: boolean
}
export interface CustomerListItem {
  id: number
  first_name: string
  username: string | null
  phone: string | null
  orders_count: number
  total_spent: number
  stamps: number
  last_order_at: string | null
}

// ---------- staff ----------
export interface StaffShort {
  id: number
  role: StaffRole
  user: UserShort
}
export interface StaffRead extends StaffShort {
  location_id: number | null
  is_active: boolean
  pin_set: boolean
  phone_linked?: boolean
  phone?: string | null
  tg_linked?: boolean
  pin_locked_until: string | null
  last_login_at: string | null
  created_at: string
}
export interface TgLinkOut {
  token: string
  expires_at: string
}
export interface StaffCreate {
  tg_id?: number | null
  phone?: string | null
  first_name?: string | null
  role: StaffRole
  location_id: number | null
}
export type StaffUpdate = Partial<Pick<StaffRead, 'role' | 'location_id' | 'is_active'>> & { phone?: string | null; first_name?: string; last_name?: string | null }

// ---------- location ----------
export interface LocationHours {
  weekday: number
  opens_at: string | null
  closes_at: string | null
  is_closed: boolean
}
export interface LocationShort {
  id: number
  name: string
  address: string
}
export interface LocationRead extends LocationShort {
  slug: string
  lat: number | null
  lng: number | null
  phone: string | null
  photo_url: string | null
  timezone: string
  accepts_orders: boolean
  payment_methods: PaymentMethod[]
  avg_prep_minutes: number
  hours: LocationHours[]
  is_open_now: boolean
}
export interface LocationCreate {
  name: string
  slug: string
  address: string
  phone?: string | null
  payment_methods: PaymentMethod[]
  avg_prep_minutes?: number
}
export interface LocationUpdate {
  name?: string
  address?: string
  phone?: string | null
  payment_methods?: PaymentMethod[]
  avg_prep_minutes?: number
  min_pickup_minutes?: number
  max_orders_per_slot?: number | null
  is_active?: boolean
  accepts_orders?: boolean
}

// ---------- menu ----------
export interface ModifierRead {
  id: number
  name: string
  price_delta: number
  is_default: boolean
  is_available: boolean
}
export interface ModifierGroupRead {
  id: number
  name: string
  min_select: number
  max_select: number
  modifiers: ModifierRead[]
}
export interface VariantRead {
  id: number
  name: string
  volume_ml: number | null
  price: number
  old_price: number | null
  is_default: boolean
  is_available: boolean
  calories: number | null
  proteins: number | null
  fats: number | null
  carbs: number | null
}
export interface ProductShort {
  id: number
  name: string
  slug: string
  description: string | null
  image_url: string | null
  min_price: number | null
  tags: string[]
  is_available: boolean
}
export interface ProductRead extends ProductShort {
  composition: string | null
  counts_for_loyalty: boolean
  can_be_gift: boolean
  variants: VariantRead[]
  modifier_groups: ModifierGroupRead[]
  is_favorite: boolean
}
export interface CategoryRead {
  id: number
  name: string
  slug: string
  icon: string | null
  image_url: string | null
  products: ProductShort[]
}
export interface BannerRead {
  id: number
  title: string
  subtitle: string | null
  image_url: string
  link_type: BannerLinkType
  link_value: string | null
}
export interface MenuOut {
  location: LocationShort
  categories: CategoryRead[]
  banners: BannerRead[]
}

// admin menu
export interface CategoryAdminRead {
  id: number
  name: string
  slug: string
  icon: string | null
  image_url: string | null
  sort_order: number
  available_from: string | null
  available_to: string | null
  is_active: boolean
}
export interface CategoryCreate {
  name: string
  slug: string
  icon?: string | null
  sort_order?: number
  available_from?: string | null
  available_to?: string | null
}
export interface VariantIn {
  id?: number | null
  name: string
  volume_ml?: number | null
  price: number
  old_price?: number | null
  sku?: string | null
  calories?: number | null
  proteins?: number | null
  fats?: number | null
  carbs?: number | null
  is_default: boolean
  sort_order?: number
  is_active: boolean
}
export interface VariantAdminRead extends VariantRead {
  sku: string | null
  sort_order: number
  is_active: boolean
}
export interface ProductAdminRead {
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
  variants: VariantAdminRead[]
  modifier_groups: ModifierGroupRead[]
  created_at: string
}
export interface ProductCreate {
  category_id: number
  name: string
  slug: string
  description?: string | null
  composition?: string | null
  image_url?: string | null
  tags: string[]
  counts_for_loyalty: boolean
  /** подарком можно взять любой напиток: сервер ставит = counts_for_loyalty */
  can_be_gift?: boolean
  sort_order?: number
  variants: VariantIn[]
  /** отмеченные добавки; группы сервер выводит сам */
  modifier_ids: number[]
}
export type ProductUpdate = Partial<ProductCreate> & { is_active?: boolean }
export interface ProductAdminFilter extends Pagination {
  category_id?: number
  is_active?: boolean
  q?: string
}

// modifiers admin
export interface ModifierIn {
  id?: number | null
  name: string
  price_delta: number
  is_default: boolean
  sort_order?: number
  is_active: boolean
}
export interface ModifierGroupCreate {
  name: string
  min_select: number
  max_select: number
  sort_order?: number
  modifiers: ModifierIn[]
}
export type ModifierGroupUpdate = Partial<ModifierGroupCreate> & { is_active?: boolean }
export interface ModifierAdminRead extends ModifierRead {
  sort_order: number
  is_active: boolean
}
export interface ModifierGroupAdminRead {
  id: number
  name: string
  min_select: number
  max_select: number
  sort_order: number
  is_active: boolean
  modifiers: ModifierAdminRead[]
}

// ---------- stock ----------
export interface StockItemRead {
  id: number
  location_id: number
  product_id: number | null
  variant_id: number | null
  modifier_id: number | null
  title: string
  until: string | null
  reason: string | null
  created_at: string
}
export interface StockItemCreate {
  product_id?: number | null
  variant_id?: number | null
  modifier_id?: number | null
  until?: string | null
  until_end_of_day?: boolean
  reason?: string | null
}

// ---------- cart ----------
export interface CartItemIn {
  product_id: number
  variant_id: number
  modifier_ids: number[]
  quantity: number
  comment?: string | null
}
export interface CartQuoteIn {
  location_id: number
  items: CartItemIn[]
  promo_code?: string | null
  use_gift: boolean
  pickup_at?: string | null
}
export interface CartItemQuote {
  index: number
  product_name: string
  variant_name: string | null
  modifiers: string[]
  unit_price: number
  quantity: number
  line_total: number
  is_gift: boolean
  is_available: boolean
  error: string | null
}
export interface CartQuoteOut {
  items: CartItemQuote[]
  subtotal: number
  promo_discount: number
  gift_discount: number
  discount_total: number
  total: number
  promo_error: string | null
  gift_available: boolean
  gift_applicable: boolean
  stamps_to_earn: number
  estimated_ready_at: string | null
  warnings: string[]
  can_checkout: boolean
}

// ---------- order ----------
export interface OrderModifierSnapshot {
  id: number
  group: string
  name: string
  price_delta: number
}
export interface OrderCreate extends CartQuoteIn {
  type: OrderType
  payment_method: PaymentMethod
  comment?: string | null
}
export interface OrderItemRead {
  id: number
  product_id: number | null
  product_name: string
  variant_name: string | null
  modifiers: OrderModifierSnapshot[]
  unit_price: number
  quantity: number
  line_total: number
  is_gift: boolean
}
export interface OrderStatusHistoryRead {
  from_status: OrderStatus | null
  to_status: OrderStatus
  comment: string | null
  created_at: string
}
export interface OrderShort {
  id: number
  display_number: string
  status: OrderStatus
  total: number
  items_count: number
  location: LocationShort
  created_at: string
}
export interface OrderRead {
  id: number
  display_number: string
  status: OrderStatus
  type: OrderType
  location: LocationShort
  pickup_at: string | null
  estimated_ready_at: string | null
  comment: string | null
  items: OrderItemRead[]
  subtotal: number
  discount_total: number
  total: number
  gift_used: boolean
  payment_method: PaymentMethod
  payment_status: OrderPaymentStatus
  payment_url: string | null
  status_history: OrderStatusHistoryRead[]
  can_cancel: boolean
  can_review: boolean
  created_at: string
}
export interface OrderCreateOut {
  order: OrderRead
  payment_url: string | null
}
export interface OrderFilter extends Pagination {
  status?: OrderStatus[]
  active_only?: boolean
}
export interface AdminOrderFilter extends Pagination {
  location_id?: number
  status?: OrderStatus[]
  payment_status?: OrderPaymentStatus
  source?: OrderSource
  date_from?: string
  date_to?: string
  q?: string
  user_id?: number
}
export interface AdminOrderRead extends OrderRead {
  user: UserShort
  source: OrderSource
  accepted_by: StaffShort | null
  accepted_at: string | null
  ready_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  cancelled_by: CancelledBy | null
}
export interface QueueOut {
  new: AdminOrderRead[]
  accepted: AdminOrderRead[]
  preparing: AdminOrderRead[]
  ready: AdminOrderRead[]
  server_time: string
}
export interface OrderStatusUpdate {
  status: OrderStatus
  comment?: string | null
  estimated_ready_at?: string | null
}

// ---------- payment ----------
export interface RefundCreate {
  amount?: number | null
  reason: string
}

// ---------- loyalty ----------
export interface LoyaltyRead {
  stamps: number
  stamps_per_gift: number
  stamps_left: number
  gifts_available: number
  lifetime_stamps: number
  lifetime_gifts: number
  tier: LoyaltyTier
  stamps_expire_days?: number | null
  gift_expire_days?: number | null
  stamps_expire_at?: string | null
  gifts_expire_at?: string | null
}
export interface LoyaltyTransactionRead {
  id: number
  type: LoyaltyTxType
  stamps_delta: number
  gifts_delta: number
  stamps_after: number
  gifts_after: number
  order_id: number | null
  reason: string | null
  created_at: string
}
export interface LoyaltyQrOut {
  token: string // в QR
  code: string // 6 цифр — гость называет бариста
  expires_at: string
  refresh_in: number
}
export interface CustomerSearchItem {
  user: UserShort
  phone: string | null
  loyalty: LoyaltyRead
}
export interface ScanResultOut {
  user: UserShort
  phone: string | null
  loyalty: LoyaltyRead
  last_orders: OrderShort[]
  /** одноразовый пропуск на штампы и подарок; есть только после кода или QR */
  visit?: string | null
}
export interface LoyaltyOperationOut {
  loyalty: LoyaltyRead
  transaction: LoyaltyTransactionRead
  gift_unlocked: boolean
}

// ---------- promo ----------
export interface PromoCheckOut {
  valid: boolean
  discount_preview: number | null
  message: string
}
export interface PromoCodeRead {
  id: number
  code: string
  description: string | null
  type: PromoType
  value: number
  product_id: number | null
  min_order_total: number | null
  max_discount: number | null
  starts_at: string | null
  ends_at: string | null
  usage_limit_total: number | null
  usage_limit_per_user: number | null
  used_count: number
  first_order_only: boolean
  location_ids: number[] | null
  is_active: boolean
  created_at: string
}
export type PromoCodeCreate = Omit<PromoCodeRead, 'id' | 'used_count' | 'is_active' | 'created_at'>
export type PromoCodeUpdate = Partial<PromoCodeCreate> & { is_active?: boolean }
export interface PromoFilter extends Pagination {
  q?: string
  is_active?: boolean
  type?: PromoType
}

// ---------- marketing ----------
export interface BannerAdminRead extends BannerRead {
  location_ids: number[] | null
  starts_at: string | null
  ends_at: string | null
  sort_order: number
  is_active: boolean
}
export type BannerCreate = Omit<BannerAdminRead, 'id' | 'is_active'>
export interface BroadcastSegment {
  location_ids?: number[] | null
  inactive_days?: number | null
  active_days?: number | null
  stamps_gte?: number | null
  has_gift?: boolean | null
  birthday_month?: number | null
  min_orders?: number | null
  only_marketing_consent: boolean
}
export interface BroadcastCreate {
  title: string
  text: string
  image_url?: string | null
  button_text?: string | null
  button_url?: string | null
  segment: BroadcastSegment
  scheduled_at?: string | null
}
export interface BroadcastRead extends BroadcastCreate {
  id: number
  status: BroadcastStatus
  started_at: string | null
  finished_at: string | null
  total_count: number
  sent_count: number
  failed_count: number
  created_at: string
}

// ---------- profile ----------
export interface ProfileOut {
  user: UserRead
  loyalty: LoyaltyRead
  orders_count: number
  active_orders: OrderShort[]
  favorites_count: number
}
export interface CustomerDetail {
  user: UserRead
  loyalty: LoyaltyRead
  last_orders: OrderShort[]
  orders_count: number
  total_spent: number
  is_blocked: boolean
}
export interface FavoriteCreate {
  product_id: number
  variant_id?: number | null
  modifier_ids: number[]
  custom_name?: string | null
}
export interface FavoriteRead {
  id: number
  product: ProductShort
  variant: VariantRead | null
  modifiers: ModifierRead[]
  custom_name: string | null
  price: number
  is_available: boolean
}
export type ReviewTag = 'fast' | 'tasty' | 'friendly' | 'slow' | 'cold' | 'wrong_order'
export interface ReviewCreate {
  rating: number
  comment?: string | null
  tags: ReviewTag[]
}
export interface ReviewRead {
  id: number
  order_id: number
  rating: number
  comment: string | null
  tags: string[]
  reply: string | null
  replied_at: string | null
  created_at: string
}
export interface ReviewAdminRead extends ReviewRead {
  user: UserShort
  location: LocationShort | null
  order_number: string
}
export interface ReviewFilter extends Pagination {
  location_id?: number
  rating?: number[]
  has_reply?: boolean
}

// ---------- stats ----------
export type StatsGroupBy = 'hour' | 'day' | 'week' | 'month'
export interface StatsFilter {
  location_id?: number
  date_from: string
  date_to: string
  group_by: StatsGroupBy
}
export interface KpiOut {
  revenue: number
  orders_count: number
  avg_check: number
  new_customers: number
  returning_customers: number
  gifts_redeemed: number
  stamps_issued: number
  avg_prep_seconds: number
  cancel_rate: number
  avg_rating: number | null
  prev_period: KpiOut | null
}
export interface TimeSeriesPoint {
  ts: string
  revenue: number
  orders: number
}
export interface TopProductOut {
  product_id: number | null
  name: string
  quantity: number
  revenue: number
}
export interface HourHeatmapCell {
  weekday: number
  hour: number
  orders: number
}
export interface DashboardOut {
  kpi: KpiOut
  series: TimeSeriesPoint[]
  top_products: TopProductOut[]
  heatmap: HourHeatmapCell[]
  payment_methods: Record<string, number>
}

// ---------- settings ----------
export interface LoyaltySettings {
  stamps_per_gift: number
  stamps_expire_days: number | null
  gift_expire_days: number | null
  birthday_gift: boolean
  referral_stamps: number
}
export interface OrderSettings {
  payment_timeout_min: number
  accept_timeout_min: number
  max_items_per_order: number
}
export interface NotificationTexts {
  order_accepted: string
  order_ready: string
  order_cancelled: string
  gift_unlocked: string
}
export interface SettingsOut {
  loyalty: LoyaltySettings
  orders: OrderSettings
  texts: NotificationTexts
}
export type SettingsUpdate = Partial<SettingsOut>

// ---------- admin session ----------
export interface AdminMe {
  user: UserRead
  staff: StaffRead
  locations: LocationShort[]
  pin_set: boolean
  pin_verified: boolean
  idle_lock_minutes: number
}
export interface PinVerifyOut {
  ok: boolean
  tokens: TokenPair | null
  attempts_left: number | null
  locked_until: string | null
}
