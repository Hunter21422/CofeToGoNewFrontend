# Кофе с тобой — фронтенд

Vue 3 + Vite + TypeScript + Pinia. Два приложения в одном проекте:

- `index.html` → `src/client`: Telegram Mini App для гостей (меню, корзина, заказ, карта штампов, профиль)
- `admin.html` (публикуется по секретному адресу `VITE_ADMIN_PATH`) → `src/admin`: панель бариста и владельца (очередь, касса, заказы, меню, стоп-лист, гости, промо, рассылки, аналитика, команда, точки, настройки)
- `src/shared`: API-клиент, типы, mock-бэкенд, UI-компоненты, токены дизайна

## Запуск

```bash
npm install
npm run dev
```

- клиент: http://localhost:5173/
- админка: http://localhost:5173/<VITE_ADMIN_PATH>/ (адрес из .env; /admin.html отдаёт 404)

По умолчанию `VITE_USE_MOCK=true`: всё работает на встроенных тестовых данных, бэкенд не нужен. Открой клиент и админку в одном браузере, и они увидят одни и те же заказы. Оформи заказ в клиенте, прими его в «Очереди», и у клиента статус обновится сам. Назови бариста код с экрана «Карта», введи его в «Кассе», и штамп появится у гостя.

Сбросить данные мока можно в Настройках или из консоли: `__zernoReset()`.

**Вход в панель: два фактора.** Первый — Telegram: в Mini App вход автоматический, в браузере работает только одноразовая ссылка от бота по команде `/admin`. Второй — личный PIN из 6 цифр, который сотрудник придумывает при первом входе. После 15 минут бездействия панель блокируется и снова просит PIN. 5 неверных попыток блокируют вход на 15 минут. Сотрудника добавляет только владелец в разделе «Команда», там же можно сбросить PIN и завершить сеансы. В демо при первом открытии панели вы зададите свой PIN.

В демо-режиме внизу боковой панели есть переключатель «Смотреть как». С ним видно, что доступно бариста, управляющему и владельцу.

## Подключение настоящего бэкенда

```env
VITE_USE_MOCK=false
VITE_API_URL=/api/v1
```

В dev Vite проксирует `/api` на `localhost:8000` (см. `vite.config.ts`). Что фронт ждёт от бэка, описано в [API.md](./API.md).

## Сборка

```bash
npm run build   # vue-tsc + vite build → dist/
```

Отдавать `dist/` через nginx/Caddy на HTTPS. В BotFather указать:
- Menu Button / Web App URL: `https://домен/`
- для бариста ссылку `https://домен/<VITE_ADMIN_PATH>/` (кнопка в боте только для staff)

## Структура

```
src/
├── shared/
│   ├── api/          http.ts (токены, ретрай 401, ошибки), client.ts, admin.ts, types.ts, mock/
│   ├── components/   UiButton, UiSheet, UiField, UiSwitch, UiSegmented, UiStepper, UiBadge,
│   │                 StampCard (карта штампов), ProductArt (иллюстрации), QrCode, UiToasts
│   ├── composables/  usePolling/useNow, useToast
│   ├── styles/       tokens.css (цвета, шрифты, радиусы; светлая и тёмная тема), base.css
│   ├── telegram.ts   обёртка WebApp: тема, haptic, BackButton, сканер QR, запрос телефона
│   └── utils/format.ts
├── client/           views: Home, Menu, Cart, Order, Orders, Card, Profile + ProductSheet и др.
└── admin/            views: Queue, Cashier, Orders, Menu, Modifiers, Stock, Customers, Promo,
                      Marketing, Stats, Reviews, Team, Locations, Settings
```

Тема (светлая или тёмная) берётся из Telegram, а вне Telegram из системы. Шрифты Onest и Unbounded лежат в сборке, Google Fonts не нужен.

## Сайт без Telegram
Тот же `index.html` открывается просто по ссылке. Вне Telegram гость входит по номеру телефона (SMS-код) или кнопкой «Войти через Telegram».
- В моке код из SMS показывается всплывашкой, кнопка Telegram входит сразу.
- Для настоящего виджета: в @BotFather → `/setdomain` → домен сайта, и `VITE_BOT_USERNAME` = ник бота.
- Сайт ставится на телефон как приложение (PWA): `manifest.webmanifest`, иконки и `sw.js` в `public/`.
