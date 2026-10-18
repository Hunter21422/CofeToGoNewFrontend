/** Эндпоинты клиентского Mini App (/api/v1/...) */
import { http, newIdempotencyKey, request, setTokens } from './http'
import type {
  CartQuoteIn,
  CartQuoteOut,
  FavoriteCreate,
  FavoriteRead,
  LocationRead,
  LoyaltyQrOut,
  LoyaltyRead,
  LoyaltyTransactionRead,
  LoyaltyTxType,
  MenuOut,
  OrderCreate,
  OrderCreateOut,
  OrderFilter,
  OrderRead,
  OrderShort,
  Page,
  Pagination,
  ProductRead,
  ProfileOut,
  PromoCheckOut,
  ReviewCreate,
  ReviewRead,
  SmsSendOut,
  TelegramWidgetUser,
  TokenPair,
  UserRead,
  UserUpdate,
} from './types'

export const clientApi = {
  // auth
  async authTelegram(initData: string) {
    const t = await request<TokenPair>('POST', '/auth/telegram', { body: { init_data: initData }, noAuth: true })
    setTokens(t)
    return t
  },

  // вход на сайте (вне Telegram)
  smsSend: (phone: string) => request<SmsSendOut>('POST', '/auth/sms/send', { body: { phone }, noAuth: true }),
  async smsVerify(phone: string, code: string) {
    const t = await request<TokenPair>('POST', '/auth/sms/verify', { body: { phone, code }, noAuth: true })
    setTokens(t)
    return t
  },
  async authTelegramWidget(user: TelegramWidgetUser) {
    const t = await request<TokenPair>('POST', '/auth/telegram-widget', { body: user, noAuth: true })
    setTokens(t)
    return t
  },
  async logout() {
    try {
      await http.post('/auth/logout')
    } finally {
      setTokens(null)
    }
  },

  // me / профиль
  me: () => http.get<UserRead>('/me'),
  profile: () => http.get<ProfileOut>('/me/profile'),
  updateMe: (data: UserUpdate) => http.patch<UserRead>('/me', data),
  setPhone: (phone: string) => http.post<UserRead>('/me/phone', { phone }),

  // точки и меню
  locations: (q?: { lat?: number; lng?: number; only_open?: boolean }) =>
    http.get<LocationRead[]>('/locations', q),
  menu: (locationId: number) => http.get<MenuOut>(`/locations/${locationId}/menu`),
  product: (locationId: number, productId: number) =>
    http.get<ProductRead>(`/locations/${locationId}/products/${productId}`),

  // корзина / заказы
  quote: (data: CartQuoteIn) => http.post<CartQuoteOut>('/cart/quote', data),
  checkPromo: (code: string, location_id: number) => http.post<PromoCheckOut>('/promo/check', { code, location_id }),
  createOrder: (data: OrderCreate, idempotencyKey = newIdempotencyKey()) =>
    http.post<OrderCreateOut>('/orders', data, { idempotencyKey }),
  orders: (f: OrderFilter = {}) =>
    http.get<Page<OrderShort>>('/orders', { ...f, status: f.status }),
  order: (id: number) => http.get<OrderRead>(`/orders/${id}`),
  cancelOrder: (id: number, reason?: string) => http.post<OrderRead>(`/orders/${id}/cancel`, { reason }),
  reviewOrder: (id: number, data: ReviewCreate) => http.post<ReviewRead>(`/orders/${id}/review`, data),

  // лояльность
  loyalty: () => http.get<LoyaltyRead>('/loyalty'),
  loyaltyQr: () => http.get<LoyaltyQrOut>('/loyalty/qr'),
  loyaltyHistory: (f: Pagination & { type?: LoyaltyTxType[] } = {}) =>
    http.get<Page<LoyaltyTransactionRead>>('/loyalty/history', { ...f }),

  // избранное
  favorites: () => http.get<FavoriteRead[]>('/favorites'),
  addFavorite: (data: FavoriteCreate) => http.post<FavoriteRead>('/favorites', data),
  removeFavorite: (id: number) => http.del(`/favorites/${id}`),
}
