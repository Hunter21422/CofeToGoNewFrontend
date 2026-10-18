# Контракт API для бэкенда

Фронт ходит на `VITE_API_URL` (по умолчанию `/api/v1`). Все схемы описаны в `backend/app/schemas/*`, их зеркало для TS лежит в `src/shared/api/types.ts`. Мок-реализация всех 77 маршрутов находится в `src/shared/api/mock/server.ts`. Когда непонятно, что именно должен делать эндпоинт, смотри туда: там рабочая логика.

**Общие правила**
- Деньги передаются в копейках (`int`), даты в ISO 8601 с таймзоной.
- Авторизация: `Authorization: Bearer <access>`. Если пришёл 401, фронт сам дёргает `/auth/refresh`, а если не получилось, заново логинится через initData.
- Ошибки в формате FastAPI: `{"detail": "Текст для человека"}`. Для 422 приходит стандартный массив `detail[]`, фронт подсветит поля по `loc[-1]`. Текст из `detail` показывается гостю как есть, поэтому писать его надо по-человечески.
- Списки возвращаются как `Page[T]` = `{items, total, limit, offset}`, фильтры передаются query-параметрами. Массивы повторяют ключ: `?status=new&status=ready`. В FastAPI это `Annotated[XxxFilter, Query()]`.
- `POST /orders` принимает заголовок `Idempotency-Key`. Если ключ повторился, верни тот же заказ, второй создавать нельзя.

## Авторизация
| Метод | Путь | Тело → Ответ |
|---|---|---|
| POST | `/auth/telegram` | `TelegramAuthIn{init_data}` → `TokenPair`. Проверить HMAC initData и `auth_date`. При `DEV_MODE` принять строку `dev=<tg_id>` |
| POST | `/auth/sms/send` | `SmsSendIn{phone}` → `SmsSendOut{expires_in, resend_in}`. **Вход на сайте.** 4-значный код в Redis `sms:{phone}` → `{hash(code), attempts}` на `SMS_CODE_TTL_SEC`; повтор не раньше `SMS_RESEND_SEC` (иначе 429), не больше `SMS_DAILY_LIMIT_PER_PHONE` в сутки и rate-limit по IP. Отправка через sms.ru; без ключа при `DEV_MODE` код пишется в лог |
| POST | `/auth/sms/verify` | `SmsVerifyIn{phone, code}` → `TokenPair`. Неверно → 400, больше `SMS_MAX_ATTEMPTS` попыток → 429 и код удаляется. Верно: найти `User` по `phone`, нет — создать (`tg_id = NULL`). Код одноразовый |
| POST | `/auth/telegram-widget` | `TelegramWidgetIn` → `TokenPair`. Кнопка «Войти через Telegram» на сайте. Проверка `core.telegram_auth.verify_login_widget` (secret = SHA256(bot_token)). Найти по `tg_id`, нет — создать. В @BotFather боту нужен `/setdomain` = домен сайта |
| POST | `/auth/logout` | отзывает текущий refresh-токен (кнопка «Выйти» на сайте) |
| POST | `/auth/refresh` | `RefreshIn` → `TokenPair`. **Флаг `pin` не переносится**: после refresh панель снова спросит PIN |
| POST | `/auth/magic` | `MagicLoginIn{token}` → `TokenPair`. Вход в панель из браузера. Бот на `/admin` (только для активного staff) кладёт в Redis `magic:{token}` → `user_id` на 120 с и присылает ссылку `https://домен/{ADMIN_PATH}/#/login?t={token}`. Токен одноразовый: прочитал и сразу удалил. Ошибка → 401 «Ссылка устарела…» |

### Вход в панель: два фактора
Обычный пользователь не может стать сотрудником. Запись в `staff` создаёт только owner через `POST /admin/staff`. Первый owner берётся из `.env OWNER_TG_IDS` при старте приложения.

1. **Telegram:** `initData` (Mini App) или одноразовая ссылка из бота (браузер).
2. **Личный PIN из 6 цифр.** В токене есть claim `pin: bool` (`TokenPayload`).
   - Зависимость `require_staff(min_role)` на всех `/admin/*`, **кроме** `/admin/me` и `/admin/auth/*`: человек в `staff`, `is_active`, `token.iat >= staff.tokens_valid_after`, `token.pin == true`. Если PIN не пройден → **403 `{"detail": "Введите PIN, чтобы продолжить", "code": "pin_required"}`**, фронт сам покажет экран PIN.
   - Access-токен с `pin=true` живёт 15 минут. Фронт и сам блокируется после 15 минут бездействия (`AdminMe.idle_lock_minutes`).

| Метод | Путь | Тело → Ответ |
|---|---|---|
| GET | `/admin/me` | → `AdminMe{user, staff, locations, pin_set, pin_verified, idle_lock_minutes}`. Работает без PIN. Не в staff → 403 |
| POST | `/admin/auth/pin/setup` | `PinSetupIn{pin, pin_repeat}` → `PinVerifyOut{ok, tokens}`. Только если PIN ещё не задан, иначе 409. Слабые PIN отсекает схема. Хранить `argon2` / `bcrypt` (passlib) |
| POST | `/admin/auth/pin/verify` | `PinVerifyIn{pin}` → `PinVerifyOut`. Неверно: `{ok:false, attempts_left}`. После 5 ошибок `pin_locked_until = now+15 мин`, ответ `{ok:false, locked_until}`, owner'у сообщение в бот, запись в `audit_logs`. Верно: сбросить счётчик, `last_login_at`, `{ok:true, tokens}` с `pin=true` |
| POST | `/admin/auth/lock` | → `TokenPair` без `pin` (кнопка «Заблокировать», автоблок) |
| POST | `/admin/auth/logout` | отзывает текущую refresh-сессию |
| POST | `/admin/staff/{id}/reset-pin` | owner → `StaffRead`. `pin_hash=NULL`, `tokens_valid_after=now`: все сеансы сотрудника закрываются, при входе он задаст новый PIN |
| POST | `/admin/staff/{id}/revoke` | owner → `StaffRead`. `tokens_valid_after=now` |

## Клиент (Mini App)
| Метод | Путь | Тело / query → Ответ |
|---|---|---|
| GET | `/me` | → `UserRead` |
| PATCH | `/me` | `UserUpdate` → `UserRead` |
| POST | `/me/phone` | `PhoneIn` → `UserRead` |
| GET | `/me/profile` | → `ProfileOut` (user, loyalty, orders_count, active_orders, favorites_count) |
| GET | `/locations` | → `LocationRead[]` (с `is_open_now`) |
| GET | `/locations/{id}/menu` | → `MenuOut`. В `ProductShort` учесть стоп-лист (`is_available`) и `available_from/to` категории. Хорошо кэшируется в Redis |
| GET | `/locations/{id}/products/{pid}` | → `ProductRead` (варианты и модификаторы с `is_available`, `is_favorite`) |
| POST | `/cart/quote` | `CartQuoteIn` → `CartQuoteOut`. Цены считает только сервер. Подарок: самый дорогой напиток (`counts_for_loyalty`) бесплатно, добавки оплачиваются. Предлагается только если `gifts_available > 0` |
| POST | `/promo/check` | `PromoCheckIn` → `PromoCheckOut` |
| POST | `/orders` | `OrderCreate` + `Idempotency-Key` → `OrderCreateOut`. Если `payment_url` есть, фронт откроет оплату. Если `use_gift`, сразу списать подарок (`gift_redeemed`) |
| GET | `/orders` | `OrderFilter` → `Page[OrderShort]` |
| GET | `/orders/{id}` | → `OrderRead`. **Фронт опрашивает раз в 3 с**, пока заказ активен |
| POST | `/orders/{id}/cancel` | `OrderCancelIn` → `OrderRead`. Только из `new` / `pending_payment`, иначе 409 |
| POST | `/orders/{id}/review` | `ReviewCreate` → `ReviewRead` |
| GET | `/loyalty` | → `LoyaltyRead`. **Опрос раз в 4 с** на экране карты, так гость видит, что штамп поставлен |
| GET | `/loyalty/qr` | → `LoyaltyQrOut{token, code, expires_at, refresh_in}` |
| GET | `/loyalty/history` | `Pagination & type[]` → `Page[LoyaltyTransactionRead]` |
| GET / POST / DELETE | `/favorites`, `/favorites/{id}` | `FavoriteCreate` → `FavoriteRead` |

## Админка (`/admin`, нужна роль)
| Метод | Путь | Роль | Тело / query → Ответ |
|---|---|---|---|
| GET | `/admin/queue?location_id=` | barista | → `QueueOut`. **Опрос раз в 4 с**, новые заказы определяются по id в `new` |
| GET | `/admin/orders` | barista | `AdminOrderFilter` → `Page[AdminOrderRead]` |
| GET | `/admin/orders/{id}` | barista | → `AdminOrderRead` |
| PATCH | `/admin/orders/{id}/status` | barista | `OrderStatusUpdate` → `AdminOrderRead`. Переходы: new→accepted/rejected, accepted→preparing/ready/rejected, preparing→ready, ready→completed. На `completed` начисляются штампы (флаг `loyalty_processed`), на `ready` гостю уходит сообщение в бот |
| POST | `/admin/orders/{id}/reject` | barista | `OrderRejectIn` → `AdminOrderRead` (возврат оплаты и подарка) |
| POST | `/admin/orders/{id}/refund` | manager | `RefundCreate` → `AdminOrderRead` |

### Касса: штампы по коду, нику и телефону
| Метод | Путь | Тело → Ответ |
|---|---|---|
| POST | `/admin/loyalty/code` | `GuestCodeIn{code, location_id}` → `ScanResultOut`. Код из 6 цифр живёт 5 минут и **сгорает после успешной проверки**. Ищется в Redis: `guest_code:{code}` → `user_id`, TTL 300 |
| GET | `/admin/loyalty/search?q=` | → `CustomerSearchItem[]` (до 8). Ищет по `@username`, цифрам телефона (8→7), имени. Если `q` короче 2 символов, ответ `[]` |
| POST | `/admin/loyalty/scan` | `QrScanIn{token, location_id}` → `ScanResultOut` |
| POST | `/admin/loyalty/stamp` | `StampAddIn{user_id, location_id, count}` → `LoyaltyOperationOut{loyalty, transaction, gift_unlocked}` |
| POST | `/admin/loyalty/redeem` | `GiftRedeemIn` → `LoyaltyOperationOut`. Если подарков нет, 409 |
| POST | `/admin/loyalty/adjust` | manager, `LoyaltyAdjustIn` → `LoyaltyOperationOut`. Уйти в минус нельзя, 409 |

Заблокированный гость → 403 на `code` / `scan`.

### Меню, стоп-лист и остальное
| Метод | Путь | Роль |
|---|---|---|
| GET POST PATCH DELETE | `/admin/categories[/{id}]`, POST `/admin/categories/reorder` | manager |
| GET POST PATCH DELETE | `/admin/products[/{id}]`. PATCH принимает `variants[]` целиком: с `id` значит обновить, без `id` создать, отсутствующие удалить | manager |
| GET POST PATCH DELETE | `/admin/modifier-groups[/{id}]` | manager |
| GET POST DELETE | `/admin/locations/{id}/stock[/{sid}]`. `StockItemCreate.until_end_of_day` → `until` = 23:59 по TZ точки | barista |
| GET | `/admin/customers` (`CustomerFilter`) → `Page[CustomerListItem]`, `/admin/customers/{id}` → `CustomerDetail` | manager |
| POST | `/admin/customers/{id}/block` `{is_blocked, reason}` → `CustomerDetail` | manager |
| GET POST PATCH | `/admin/promo-codes[/{id}]` | manager |
| GET POST PATCH DELETE | `/admin/banners[/{id}]` | owner |
| GET POST | `/admin/broadcasts`, POST `/admin/broadcasts/segment-preview` (`BroadcastSegment` → `{count}`), POST `/admin/broadcasts/{id}/send` | owner |
| GET | `/admin/stats/dashboard` (`StatsFilter`) → `DashboardOut` (с `kpi.prev_period` за такой же предыдущий отрезок) | manager |
| GET POST | `/admin/reviews` (`ReviewFilter`), `/admin/reviews/{id}/reply` | manager |
| GET POST PATCH | `/admin/staff[/{id}]`. Создавать сотрудников может **только owner**, `created_by_id` = кто добавил | owner |
| GET PATCH | `/admin/locations[/{id}]`, PUT `/admin/locations/{id}/hours` (`LocationHoursUpdate`) | owner; `accepts_orders` может менять barista своей точки |
| GET PATCH | `/admin/settings` | owner |

## Синхронизация статусов
Бариста меняет статус → в БД пишется `order_status_history` → у клиента `GET /orders/{id}` через ≤3 с отдаёт новый статус, экран обновляется сам. Когда добавим WebSocket (`/ws/orders/{id}` и `/ws/admin/queue`), фронт поменяется только в `usePolling`, экраны трогать не придётся.

### Добавки у товара
`ProductCreate/Update.modifier_ids` — id отмеченных добавок. Сервис группирует их по `group_id` и пишет в `product_modifier_groups(product_id, group_id, modifier_ids)`. В `ProductRead.modifier_groups` у каждой группы только отмеченные добавки. Поля `can_be_gift` в запросе нет: подарком может быть любой напиток, `can_be_gift = counts_for_loyalty`.

### Сайт без Telegram
- Один гость = один `User`. Ключи: `tg_id` (Mini App, виджет) и `phone` (SMS). Оба `unique`, `tg_id` может быть `NULL`.
- **Склейка аккаунтов.** Гость из Telegram в `/me/phone` указал номер, который уже есть у веб-аккаунта без `tg_id`: перенести заказы, избранное, отзывы и штампы (сложить `stamps`, `gifts_available`, `lifetime_*`, пересчитать подарки по `stamps_per_gift`) на текущего юзера, второй удалить, записать в `audit_logs`. Если у того номера уже есть другой `tg_id` → 409 «Номер привязан к другому аккаунту».
- **Уведомления.** У веб-гостя без `tg_id` в Telegram писать некуда: статусы видны на экране заказа (polling). Web Push — следующим этапом.
- **Безопасность.** Telegram initData и виджет проверяются только на сервере. Токены на сайте живут в `sessionStorage`/`localStorage` как и в Mini App; refresh — httpOnly-cookie не обязателен, но CORS только на свой домен.
