import { createRouter, createWebHashHistory } from 'vue-router'

// Hash-история: Mini App открывается по одному URL, без настройки сервера под SPA
export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior(_to, _from, saved) {
    return saved ?? { top: 0 }
  },
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue'), meta: { tab: true } },
    { path: '/menu', name: 'menu', component: () => import('./views/MenuView.vue'), meta: { tab: true } },
    { path: '/card', name: 'card', component: () => import('./views/CardView.vue'), meta: { tab: true } },
    { path: '/profile', name: 'profile', component: () => import('./views/ProfileView.vue'), meta: { tab: true } },
    { path: '/cart', name: 'cart', component: () => import('./views/CartView.vue'), meta: { back: true } },
    { path: '/orders', name: 'orders', component: () => import('./views/OrdersView.vue'), meta: { back: true } },
    { path: '/orders/:id', name: 'order', component: () => import('./views/OrderView.vue'), meta: { back: true }, props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
