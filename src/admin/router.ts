import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import type { StaffRole } from '@/shared/api/types'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    role?: StaffRole
    nav?: 'main' | 'more'
    icon?: string
  }
}

export const adminRoutes: RouteRecordRaw[] = [
  { path: '/', name: 'queue', component: () => import('./views/QueueView.vue'), meta: { title: 'Очередь', role: 'barista', nav: 'main', icon: 'LayoutGrid' } },
  { path: '/cashier', name: 'cashier', component: () => import('./views/CashierView.vue'), meta: { title: 'Касса', role: 'barista', nav: 'main', icon: 'ScanLine' } },
  { path: '/orders', name: 'orders', component: () => import('./views/OrdersView.vue'), meta: { title: 'Заказы', role: 'barista', nav: 'main', icon: 'ListOrdered' } },
  { path: '/stock', name: 'stock', component: () => import('./views/StockView.vue'), meta: { title: 'Стоп-лист', role: 'barista', nav: 'more', icon: 'Ban' } },
  { path: '/menu', name: 'menu', component: () => import('./views/MenuView.vue'), meta: { title: 'Меню', role: 'manager', nav: 'more', icon: 'UtensilsCrossed' } },
  { path: '/modifiers', name: 'modifiers', component: () => import('./views/ModifiersView.vue'), meta: { title: 'Добавки', role: 'manager', nav: 'more', icon: 'Milk' } },
  { path: '/customers', name: 'customers', component: () => import('./views/CustomersView.vue'), meta: { title: 'Гости', role: 'manager', nav: 'more', icon: 'Users' } },
  { path: '/promo', name: 'promo', component: () => import('./views/PromoView.vue'), meta: { title: 'Промокоды', role: 'manager', nav: 'more', icon: 'Percent' } },
  { path: '/marketing', name: 'marketing', component: () => import('./views/MarketingView.vue'), meta: { title: 'Баннеры и рассылки', role: 'owner', nav: 'more', icon: 'Megaphone' } },
  { path: '/stats', name: 'stats', component: () => import('./views/StatsView.vue'), meta: { title: 'Аналитика', role: 'manager', nav: 'more', icon: 'ChartColumn' } },
  { path: '/reviews', name: 'reviews', component: () => import('./views/ReviewsView.vue'), meta: { title: 'Отзывы', role: 'manager', nav: 'more', icon: 'MessageSquare' } },
  { path: '/team', name: 'team', component: () => import('./views/TeamView.vue'), meta: { title: 'Команда', role: 'owner', nav: 'more', icon: 'UserCog' } },
  { path: '/locations', name: 'locations', component: () => import('./views/LocationsView.vue'), meta: { title: 'Точки', role: 'owner', nav: 'more', icon: 'Store' } },
  { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue'), meta: { title: 'Настройки', role: 'owner', nav: 'more', icon: 'Settings' } },
  // ссылка из бота: токен забирает стор при загрузке, из адресной строки он сразу пропадает
  { path: '/login', redirect: () => ({ path: '/', query: {} }) },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({ history: createWebHashHistory(), routes: adminRoutes })
