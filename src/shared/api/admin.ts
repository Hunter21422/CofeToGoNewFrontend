/** Эндпоинты админки (/api/v1/admin/...) */
import { http, request, setTokens } from './http'
import type {
  AdminMe,
  AdminOrderFilter,
  AdminOrderRead,
  BannerAdminRead,
  BannerCreate,
  BroadcastCreate,
  BroadcastRead,
  BroadcastSegment,
  CategoryAdminRead,
  CategoryCreate,
  CustomerDetail,
  CustomerSearchItem,
  CustomerFilter,
  CustomerListItem,
  DashboardOut,
  LocationHours,
  LocationCreate,
  LocationRead,
  LocationUpdate,
  LoyaltyOperationOut,
  ModifierGroupAdminRead,
  ModifierGroupCreate,
  ModifierGroupUpdate,
  OrderStatusUpdate,
  Page,
  ProductAdminFilter,
  ProductAdminRead,
  ProductCreate,
  ProductUpdate,
  PromoCodeCreate,
  PromoCodeRead,
  PromoCodeUpdate,
  PinVerifyOut,
  TokenPair,
  PromoFilter,
  QueueOut,
  RefundCreate,
  ReviewAdminRead,
  ReviewFilter,
  ScanResultOut,
  TgLinkOut,
  SmsSendOut,
  SettingsOut,
  SettingsUpdate,
  StaffCreate,
  StaffRead,
  StaffUpdate,
  StatsFilter,
  StockItemCreate,
  StockItemRead,
} from './types'

const A = '/admin'

export const adminApi = {
  me: () => http.get<AdminMe>(`${A}/me`),

  // вход и второй фактор
  async magicLogin(token: string) {
    const t = await request<TokenPair>('POST', '/auth/magic', { body: { token }, noAuth: true })
    setTokens(t)
    return t
  },
  staffPhoneSend: (phone: string) => request<SmsSendOut>('POST', `${A}/auth/phone/send`, { body: { phone }, noAuth: true }),
  async pinSetup(pin: string, pin_repeat: string) {
    const r = await http.post<PinVerifyOut>(`${A}/auth/pin/setup`, { pin, pin_repeat })
    if (r.tokens) setTokens(r.tokens)
    return r
  },
  async pinVerify(pin: string) {
    const r = await http.post<PinVerifyOut>(`${A}/auth/pin/verify`, { pin })
    if (r.tokens) setTokens(r.tokens)
    return r
  },
  /** Заблокировать панель: бэк выдаёт токен без флага pin */
  async lock() {
    setTokens(await http.post<TokenPair>(`${A}/auth/lock`))
  },
  async logout() {
    try {
      await http.post(`${A}/auth/logout`)
    } finally {
      setTokens(null)
    }
  },
  resetStaffPin: (id: number) => http.post<StaffRead>(`${A}/staff/${id}/reset-pin`),
  revokeStaffSessions: (id: number) => http.post<StaffRead>(`${A}/staff/${id}/revoke`),
  staffTgLink: (id: number) => http.post<TgLinkOut>(`${A}/staff/${id}/tg-link`),

  // очередь и заказы
  queue: (location_id: number) => http.get<QueueOut>(`${A}/queue`, { location_id }),
  orders: (f: AdminOrderFilter) => http.get<Page<AdminOrderRead>>(`${A}/orders`, { ...f }),
  order: (id: number) => http.get<AdminOrderRead>(`${A}/orders/${id}`),
  setStatus: (id: number, data: OrderStatusUpdate) => http.patch<AdminOrderRead>(`${A}/orders/${id}/status`, data),
  reject: (id: number, reason: string) => http.post<AdminOrderRead>(`${A}/orders/${id}/reject`, { reason }),
  refund: (id: number, data: RefundCreate) => http.post<AdminOrderRead>(`${A}/orders/${id}/refund`, data),

  // касса / лояльность
  scan: (token: string, location_id: number) => http.post<ScanResultOut>(`${A}/loyalty/scan`, { token, location_id }),
  checkCode: (code: string, location_id: number) => http.post<ScanResultOut>(`${A}/loyalty/code`, { code, location_id }),
  searchGuest: (q: string) => http.get<CustomerSearchItem[]>(`${A}/loyalty/search`, { q }),
  addStamps: (user_id: number, location_id: number, count: number, visit: string) =>
    http.post<LoyaltyOperationOut>(`${A}/loyalty/stamp`, { user_id, location_id, count, visit }),
  redeemGift: (user_id: number, location_id: number, visit: string) =>
    http.post<LoyaltyOperationOut>(`${A}/loyalty/redeem`, { user_id, location_id, visit }),
  adjustLoyalty: (user_id: number, stamps_delta: number, gifts_delta: number, reason: string) =>
    http.post<LoyaltyOperationOut>(`${A}/loyalty/adjust`, { user_id, stamps_delta, gifts_delta, reason }),

  // меню
  categories: () => http.get<CategoryAdminRead[]>(`${A}/categories`),
  createCategory: (d: CategoryCreate) => http.post<CategoryAdminRead>(`${A}/categories`, d),
  updateCategory: (id: number, d: Partial<CategoryAdminRead>) => http.patch<CategoryAdminRead>(`${A}/categories/${id}`, d),
  deleteCategory: (id: number) => http.del(`${A}/categories/${id}`),
  reorderCategories: (ids: number[]) => http.post(`${A}/categories/reorder`, { ids }),

  products: (f: ProductAdminFilter = {}) => http.get<Page<ProductAdminRead>>(`${A}/products`, { ...f }),
  productDetail: (id: number) => http.get<ProductAdminRead>(`${A}/products/${id}`),
  createProduct: (d: ProductCreate) => http.post<ProductAdminRead>(`${A}/products`, d),
  updateProduct: (id: number, d: ProductUpdate) => http.patch<ProductAdminRead>(`${A}/products/${id}`, d),
  deleteProduct: (id: number) => http.del(`${A}/products/${id}`),

  modifierGroups: () => http.get<ModifierGroupAdminRead[]>(`${A}/modifier-groups`),
  createModifierGroup: (d: ModifierGroupCreate) => http.post<ModifierGroupAdminRead>(`${A}/modifier-groups`, d),
  updateModifierGroup: (id: number, d: ModifierGroupUpdate) =>
    http.patch<ModifierGroupAdminRead>(`${A}/modifier-groups/${id}`, d),
  deleteModifierGroup: (id: number) => http.del(`${A}/modifier-groups/${id}`),

  // стоп-лист
  stock: (location_id: number) => http.get<StockItemRead[]>(`${A}/locations/${location_id}/stock`),
  addStock: (location_id: number, d: StockItemCreate) =>
    http.post<StockItemRead>(`${A}/locations/${location_id}/stock`, d),
  removeStock: (location_id: number, id: number) => http.del(`${A}/locations/${location_id}/stock/${id}`),

  // клиенты
  customers: (f: CustomerFilter) => http.get<Page<CustomerListItem>>(`${A}/customers`, { ...f }),
  customer: (id: number) => http.get<CustomerDetail>(`${A}/customers/${id}`),
  blockCustomer: (id: number, is_blocked: boolean, reason?: string) =>
    http.post<CustomerDetail>(`${A}/customers/${id}/block`, { is_blocked, reason }),

  // промо
  promos: (f: PromoFilter = {}) => http.get<Page<PromoCodeRead>>(`${A}/promo-codes`, { ...f }),
  createPromo: (d: PromoCodeCreate) => http.post<PromoCodeRead>(`${A}/promo-codes`, d),
  updatePromo: (id: number, d: PromoCodeUpdate) => http.patch<PromoCodeRead>(`${A}/promo-codes/${id}`, d),

  // маркетинг
  banners: () => http.get<BannerAdminRead[]>(`${A}/banners`),
  createBanner: (d: BannerCreate) => http.post<BannerAdminRead>(`${A}/banners`, d),
  updateBanner: (id: number, d: Partial<BannerAdminRead>) => http.patch<BannerAdminRead>(`${A}/banners/${id}`, d),
  deleteBanner: (id: number) => http.del(`${A}/banners/${id}`),
  broadcasts: () => http.get<BroadcastRead[]>(`${A}/broadcasts`),
  createBroadcast: (d: BroadcastCreate) => http.post<BroadcastRead>(`${A}/broadcasts`, d),
  segmentPreview: (segment: BroadcastSegment) => http.post<{ count: number }>(`${A}/broadcasts/segment-preview`, segment),
  sendBroadcast: (id: number) => http.post<BroadcastRead>(`${A}/broadcasts/${id}/send`),

  // аналитика
  dashboard: (f: StatsFilter) => http.get<DashboardOut>(`${A}/stats/dashboard`, { ...f }),

  // отзывы
  reviews: (f: ReviewFilter = {}) => http.get<Page<ReviewAdminRead>>(`${A}/reviews`, { ...f }),
  replyReview: (id: number, reply: string) => http.post<ReviewAdminRead>(`${A}/reviews/${id}/reply`, { reply }),

  // персонал / точки / настройки
  staff: () => http.get<StaffRead[]>(`${A}/staff`),
  createStaff: (d: StaffCreate) => http.post<StaffRead>(`${A}/staff`, d),
  updateStaff: (id: number, d: StaffUpdate) => http.patch<StaffRead>(`${A}/staff/${id}`, d),

  locations: () => http.get<LocationRead[]>(`${A}/locations`),
  createLocation: (d: LocationCreate) => http.post<LocationRead>(`${A}/locations`, d),
  updateLocation: (id: number, d: LocationUpdate) => http.patch<LocationRead>(`${A}/locations/${id}`, d),
  updateHours: (id: number, hours: LocationHours[]) => http.put<LocationRead>(`${A}/locations/${id}/hours`, { hours }),

  settings: () => http.get<SettingsOut>(`${A}/settings`),
  updateSettings: (d: SettingsUpdate) => http.patch<SettingsOut>(`${A}/settings`, d),
}
