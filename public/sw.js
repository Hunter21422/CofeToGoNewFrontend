// Минимальный service worker: нужен, чтобы сайт можно было «установить» на телефон.
// Ничего не кэширует — меню, цены и статусы заказов всегда свежие с сервера.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
