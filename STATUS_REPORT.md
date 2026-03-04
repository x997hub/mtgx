# MTGx — Отчёт о реализованном функционале

**Дата:** 2026-03-04
**Статус:** MVP собран, все 12 блоков реализованы

---

## Инфраструктура

| Компонент | Статус | Детали |
|---|---|---|
| Supabase проект | ✅ Создан | Region: EU West (Ireland), Free tier |
| PostgreSQL БД | ✅ Миграции применены | 14 таблиц, RLS policies, триггеры, индексы |
| Google OAuth | ✅ Настроен | Google Cloud Console → Supabase Auth Provider |
| Vercel деплой | ✅ Подключен | Автодеплой из `x997hub/mtgx` ветка `main` |
| GitHub CI | ⏳ Секреты добавляются | `SUPABASE_PROD_DB_URL` + `VERCEL_TOKEN` |
| i18n | ✅ EN + RU | 4 namespace файла на каждый язык |

---

## База данных (Блок 1)

3 миграции применены к production Supabase:

| Таблица | Назначение |
|---|---|
| profiles | Профиль игрока (extends auth.users) |
| availability | Недельная сетка доступности (14 строк на юзера) |
| venues | Клубы / площадки |
| venue_photos | Фото площадок (Supabase Storage) |
| events | Мероприятия (big + quick) |
| rsvps | Записи на события (going/maybe/not_going) |
| rsvp_history | Аудит изменений RSVP (для reliability score) |
| subscriptions | Подписки на организатора/venue/формат+город |
| looking_for_game | Сигнал «ищу игру» (24ч auto-expire) |
| push_subscriptions | Web Push подписки (PWA) |
| notification_outbox | Очередь уведомлений (outbox pattern) |
| notification_sent | Дедупликация уведомлений |
| notifications | In-app уведомления |
| admin_reports | Ежедневные отчёты администратора |

RLS policies на всех таблицах. Триггеры: RSVP audit, outbox на новое событие, auto-expire для quick meetups. Функция `availability_match()` для умного матчинга игроков.

---

## Frontend — Страницы (Блоки 2–12)

| Route | Страница | Что реализовано |
|---|---|---|
| `/login` | LoginPage | Кнопка Google OAuth |
| `/onboarding` | OnboardingPage | Пошаговый флоу: город → форматы → доступность (chips, можно пропустить) → подписки |
| `/` | EventFeedPage | Лента событий с фильтрами по формату/городу, LFG-баннеры, FAB «Хочу поиграть», карточки с RSVP-счётчиком и spots left |
| `/events/:id` | EventDetailPage | Детали события, RSVPButton, RSVPDialog (going/maybe/not_going), AttendeeList (сгруппированный), EventCountdown, WhatsApp шеринг, Realtime обновление счётчика |
| `/events/new` | CreateEventPage | EventTypeToggle (big/quick), BigEventForm (полная форма с venue selector, clone defaults), QuickMeetupForm (3–4 поля, auto expires_at) |
| `/profile` | ProfilePage | Просмотр профиля, reliability score (виден оргам/админам) |
| `/profile/edit` | ProfileEditPage | Редактирование: город, форматы, полная сетка доступности (14 слотов), WhatsApp, управление подписками |
| `/venues/:id` | VenuePage | Публичная страница клуба: VenueHeader с фото из Storage, VenueInfo (часы работы, контакты), UpcomingEvents, кнопка подписки |
| `/notifications` | NotificationsPage | Список уведомлений, mark as read |
| `/settings` | SettingsPage | Переключатель языка (EN/RU), Push permissions |
| `/admin` | AdminPage | Ежедневный отчёт (DailyReportPayload), таблица юзеров, назначение ролей, reliability badges |

---

## Компоненты

### Events
| Компонент | Назначение |
|---|---|
| EventCard | Карточка события в ленте (формат, дата, venue, RSVP count, spots left) |
| EventFormFields | Общие поля формы создания |
| BigEventForm | Полная форма большого мероприятия |
| QuickMeetupForm | Упрощённая форма быстрой встречи |
| EventTypeToggle | Переключатель big/quick |
| EventCountdown | Таймер до начала события |
| RSVPButton | Кнопка записи на событие |
| RSVPDialog | Диалог выбора статуса (going/maybe/not_going) |
| AttendeeList | Список участников (сгруппированный по статусу) |
| FormatFilter | Фильтр по формату в ленте |
| CityFilter | Фильтр по городу в ленте |
| LFGBanner | Баннер «ищу игру» в ленте |
| LFGToggleButton | Кнопка включения/выключения LFG сигнала |
| LFGSignalList | Список активных LFG сигналов |

### Profile
| Компонент | Назначение |
|---|---|
| AvailabilityGrid | Полная сетка доступности (7 дней × 2 слота) |
| AvailabilityChips | Chip-selector для онбординга (упрощённый) |
| FormatPicker | Мульти-выбор форматов |

### Venue
| Компонент | Назначение |
|---|---|
| VenueHeader | Шапка страницы клуба с фото из Storage |
| VenueInfo | Часы работы, контакты, адрес |
| UpcomingEvents | Предстоящие события в клубе |

### Shared
| Компонент | Назначение |
|---|---|
| WhatsAppShareButton | Шеринг события в WhatsApp |
| SubscribeButton | Подписка на организатора/venue/формат+город (иконки по типу) |
| FormatBadge | Бейдж формата (цветовая кодировка) |
| CityBadge | Бейдж города |
| FAB | Floating Action Button «Хочу поиграть» |
| NotificationBell | Колокольчик уведомлений в навигации |
| EmptyState | Пустое состояние (Day 1 UX) |
| OfflineBanner | Баннер при потере соединения |
| PushPermissionPrompt | Запрос разрешения на push-уведомления |
| ErrorBoundary | Обработка ошибок React |

### Layout
| Компонент | Назначение |
|---|---|
| AppShell | Основной layout (bottom nav на мобильных, sidebar на десктопе) |
| ProtectedRoute | Редирект на /login или /onboarding если нет профиля |
| FormLayout | Layout для форм создания |

### UI (shadcn/ui)
button, card, input, label, select, badge, dialog, tabs, toast, toaster, avatar, separator, skeleton, dropdown-menu, toggle, toggle-group, sheet

---

## Hooks

| Hook | Назначение |
|---|---|
| useAuth | Google OAuth sign-in/sign-out, состояние сессии |
| useProfile | CRUD профиля, upsert при первом входе |
| useEvents | Запросы событий, фильтрация, polling (TanStack Query) |
| useRSVP | RSVP мутации с optimistic UI, Supabase Realtime подписка |
| useLFG | Создание/удаление LFG сигнала, auto-expire |
| useSubscription | Подписка/отписка на организатора/venue/формат+город |
| useNotifications | Список уведомлений, mark as read |
| usePush | Web Push registration, VAPID, Service Worker |

---

## Stores (Zustand)

| Store | Назначение |
|---|---|
| authStore | Текущий юзер, сессия, роль |
| filterStore | Фильтры ленты (формат, город) |
| uiStore | UI состояние (sidebar, modals) |

---

## Backend (Supabase Edge Functions)

| Функция | Назначение |
|---|---|
| mtgx-api | Бизнес-логика: RSVP с pessimistic lock, создание событий, LFG, назначение ролей |
| mtgx-poller | Фоновые задачи: отправка push из outbox, expire quick meetups/LFG, напоминания 24ч, проверка min_players, генерация ежедневного отчёта |

---

## Локализация

| Namespace | EN | RU |
|---|---|---|
| common.json | ✅ | ✅ |
| events.json | ✅ | ✅ |
| profile.json | ✅ | ✅ |
| venue.json | ✅ | ✅ |

Все hardcoded строки заменены на i18n ключи.

---

## PWA

- Service Worker (vite-plugin-pwa + Workbox)
- NetworkFirst для API, CacheFirst для assets
- Web Push через VAPID
- Offline banner
- manifest.webmanifest

---

## CI/CD

| Файл | Назначение |
|---|---|
| `.github/workflows/ci.yml` | lint + typecheck + test + deploy |
| `.github/workflows/keepalive.yml` | Ping Supabase каждые 6 дней (предотвращение auto-pause) |

---

## Что НЕ реализовано (отложено на фазу 2+)

- Календарь клуба с резервацией слотов
- Recurring events (шаблоны + rrule)
- Google Maps интеграция
- Радиус готовности ехать
- Иврит / RTL
- WhatsApp / Telegram боты
- Нативное приложение
- Монетизация / платежи

---

*Отчёт сгенерирован 2026-03-04 по результатам анализа кодовой базы проекта.*
