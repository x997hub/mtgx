# MTGx — Полная документация приложения

> MTG Social Platform для поиска игр, организации турниров и координации игроков Magic: The Gathering в Израиле.

**Production:** https://mtgx-sooty.vercel.app/
**Repo:** https://github.com/x997hub/mtgx.git
**Стек:** React 19 + TypeScript 5.7 + Vite 6 + Supabase + Tailwind CSS 4 + Zustand + React Query
**Дата:** 2026-03-06

---

## Оглавление

1. [Обзор продукта](#1-обзор-продукта)
2. [Пользовательские сценарии](#2-пользовательские-сценарии)
3. [Архитектура](#3-архитектура)
4. [Маршрутизация и страницы](#4-маршрутизация-и-страницы)
5. [Компоненты](#5-компоненты)
6. [Бизнес-логика (Hooks)](#6-бизнес-логика-hooks)
7. [State Management (Stores)](#7-state-management-stores)
8. [База данных](#8-база-данных)
9. [API и Edge Functions](#9-api-и-edge-functions)
10. [Безопасность](#10-безопасность)
11. [Интернационализация](#11-интернационализация)
12. [PWA и Service Worker](#12-pwa-и-service-worker)
13. [Тестирование](#13-тестирование)
14. [Деплой и инфраструктура](#14-деплой-и-инфраструктура)

---

## 1. Обзор продукта

MTGx — PWA-приложение для MTG-сообщества Израиля. Основные возможности:

- **Поиск и создание событий** — турниры (Big Events) и быстрые встречи (Quick Meetups)
- **RSVP-система** — going/maybe/not_going с пессимистичной блокировкой на уровне БД
- **LFG (Looking For Game)** — сигнал "ищу игру" с 24-часовым таймером и realtime-обновлениями
- **Директория игроков** — фильтры по формату, городу, доступности, площадке
- **Система приглашений** — invite игроков на события, рекомендации, auto-match
- **Профили** — форматы, расписание доступности, car access, trading, reliability score
- **Площадки (Venues)** — фото, контакты, расписание, поддерживаемые форматы
- **Подписки** — на организатора, площадку, комбинацию формат+город
- **Push-уведомления** — Web Push API + in-app notifications
- **Админ-панель** — отчёты, управление ролями, список событий

### Роли пользователей

| Роль | Права |
|------|-------|
| `player` | RSVP, LFG, профиль, подписки, Quick Meetup |
| `organizer` | + Big Events, управление своими событиями, invite рекомендации |
| `club_owner` | + Big Events, управление площадками |
| `admin` | + админ-панель, назначение ролей, доступ ко всем данным |

### Поддерживаемые форматы MTG

`pauper` · `commander` · `standard` · `draft`

### Города

`Rishon LeZion` · `Tel Aviv` · `Ramat Gan` · `Herzliya` · `Kfar Saba`

---

## 2. Пользовательские сценарии

### 2.1. Регистрация и онбординг

```
Google OAuth (PKCE) → ProtectedRoute → /onboarding (4 шага)
```

1. **Шаг 0 — Город**: выбор из списка CITIES
2. **Шаг 1 — Форматы**: toggle-кнопки (pauper/commander/standard/draft)
3. **Шаг 2 — Доступность**: сетка 7 дней × 3 слота (morning/day/evening), 3 состояния: available/sometimes/unavailable
4. **Шаг 3 — Подписки**: preview подписок, автоматическая подписка на выбранные format+city

На каждом шаге можно нажать Skip. При финише создаётся профиль и подписки.

### 2.2. Лента событий (главная)

```
/ → EventFeedPage
```

- **Фильтры**: формат (select) + город (select) + кнопка "Browse All" для сброса
- **Секции**: "Today" (выделенный блок с пинг-анимацией) + "Upcoming"
- **LFG-блок**: баннер с количеством ищущих игру → кнопка активации → список сигналов
- **Infinite scroll**: IntersectionObserver на sentinel-элементе
- **FAB**: кнопка "Create" (мобильная, скрыта на desktop)

### 2.3. Создание события

```
/events/new → CreateEventPage
```

**Big Event** (organizer/club_owner/admin):
- Заголовок, формат, город, дата/время, площадка, min/max игроков, взнос, описание
- После создания → RecommendedPlayersPanel (рекомендованные игроки для приглашения)

**Quick Meetup** (все роли):
- Формат, город, дата/время, min игроков
- Автоматический expires_at = starts_at + 24h

**Клонирование**: Organizer может клонировать своё событие (starts_at намеренно не копируется).

### 2.4. Детали события и RSVP

```
/events/:id → EventDetailPage
```

- Информация: формат, дата/время, countdown, venue, fee, описание, organizer
- **RSVP**: кнопка → Dialog с 3 вариантами (Going/Maybe/Not Going)
  - Оптимистичное обновление UI
  - Пессимистичная блокировка в БД (`SELECT ... FOR UPDATE`)
  - Проверка max_players перед `going`
- **Attendees**: группировка по статусу (going → maybe → not_going)
- **Realtime**: изменения RSVP обновляются через Supabase channel
- **Share**: WhatsApp кнопка с pre-filled текстом
- **Clone**: кнопка для organizer

### 2.5. Система приглашений

**Отправка приглашений:**
- Organizer после создания события видит RecommendedPlayersPanel
- Рекомендации: RPC `get_recommended_invites` учитывает формат, город, доступность, visibility, played_together
- Bulk invite: multi-select + сообщение → RPC `send_bulk_invites`
- Rate limit: 5 invites/day для non-organizers

**Получение приглашений:**
- `/notifications` → вкладка Invites
- Accept → автоматический RSVP "going" (если есть event_id)
- Decline → уведомление отправителю

**Настройки приглашений (ProfileEditPage → InvitePreferencesSettings):**
- is_open: принимает ли приглашения
- available_slots: когда может играть (сетка)
- formats: какие форматы интересуют
- visibility: all / played_together / my_venues / none
- DND mode: "не беспокоить" до указанной даты

### 2.6. LFG (Looking For Game)

```
EventFeedPage → LFGToggleButton
```

- **Активация**: выбрать город + форматы + preferred slot → сигнал на 24 часа
- **Деактивация**: одна кнопка
- **Отображение**: LFGBanner (count) + LFGSignalList (аватары, форматы, slot)
- **Realtime**: канал `lfg:{city}` для live-обновлений
- **Expiry**: cron в mtgx-poller удаляет истёкшие сигналы

### 2.7. Профиль

```
/profile → ProfilePage (свой)
/profile/:userId → ProfilePage (чужой)
/profile/edit → ProfileEditPage
```

**Просмотр:**
- Avatar (инициалы), имя, город, роль
- Bio, WhatsApp (ссылка), car access, trading
- Reliability score (видно только organizer/club_owner/admin)
- Форматы (FormatBadge), Availability Grid (read-only)
- Подписки (только свой профиль)
- Кнопка "Invite to Play" (на чужом профиле, если invite prefs открыты)

**Редактирование:**
- Display name, город, WhatsApp (валидация: 7-15 цифр), bio
- Форматы (toggle), car access (yes/no/sometimes), trading (checkbox)
- Availability Grid (click → cycle: available → sometimes → unavailable)
- Auto-Match Settings, Invite Preferences Settings
- Save: updateProfile + updateAvailability (два отдельных запроса)

### 2.8. Директория игроков

```
/players → PlayersDirectoryPage
```

- **4 фильтра**: формат, город, день доступности, площадка
- **PlayerCard**: аватар, имя, город, роль, форматы, mini availability grid, reliability
- **Infinite scroll**: пагинация по 20 игроков
- **Click** → переход на профиль игрока

### 2.9. Площадки

```
/venues/:id → VenuePage
```

- Фото (primary из Supabase Storage), название, город
- Информация: адрес, часы работы, вместимость, контакты
- Поддерживаемые форматы (FormatBadge)
- Кнопка Subscribe
- Предстоящие события в этой площадке (EventCard)

### 2.10. Настройки

```
/settings → SettingsPage
```

- **Язык**: EN / RU (i18n с автосохранением в localStorage)
- **Push-уведомления**: статус (granted/denied/not supported), кнопка Enable
- **Подписки**: список с кнопкой Unsubscribe
- **Выход**: logout с очисткой store

### 2.11. Уведомления

```
/notifications → NotificationsPage
```

- **Вкладка Notifications**: список in-app уведомлений, Mark as Read (по одному / все)
- **Вкладка Invites**: входящие приглашения с Accept/Decline
- **Realtime**: канал "notifications" для мгновенного обновления
- **Badge**: NotificationBell в AppShell показывает count непрочитанных

### 2.12. Админ-панель

```
/admin → AdminPage (только role=admin)
```

**3 вкладки:**

1. **Report**: ежедневный отчёт (new_users, events_created, rsvps, lfg_signals, low_reliability_users, cancellations)
2. **Users**: список всех профилей с Select для смены роли
3. **Events**: список последних 50 событий с format, organizer, status badge

---

## 3. Архитектура

### Высокоуровневая схема

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (SPA)                          │
│  React 19 + Vite 6 + Tailwind 4 + PWA (Workbox)        │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐             │
│  │  Pages   │→ │  Hooks   │→ │ Supabase  │             │
│  │  (lazy)  │  │ (RQ+WS)  │  │  JS SDK   │             │
│  └──────────┘  └──────────┘  └─────┬─────┘             │
│  ┌──────────┐  ┌──────────┐        │                    │
│  │Components│  │  Stores  │        │                    │
│  │(Radix UI)│  │(Zustand) │        │                    │
│  └──────────┘  └──────────┘        │                    │
└────────────────────────────────────┼────────────────────┘
                                     │ HTTPS / WSS
┌────────────────────────────────────┼────────────────────┐
│                  Supabase Cloud                          │
│  ┌─────────┐  ┌──────────┐  ┌─────┴─────┐              │
│  │  Auth   │  │ Realtime │  │  PostgREST│              │
│  │ (PKCE)  │  │ (WS)     │  │  (REST)   │              │
│  └─────────┘  └──────────┘  └───────────┘              │
│  ┌─────────────────────────────────────┐                │
│  │         PostgreSQL 17               │                │
│  │  16 tables · RLS · triggers · RPC   │                │
│  └─────────────────────────────────────┘                │
│  ┌─────────────┐  ┌──────────────────┐                  │
│  │ Edge Func:  │  │ Edge Func:       │                  │
│  │ mtgx-api    │  │ mtgx-poller      │                  │
│  │ (6 routes)  │  │ (7 cron jobs)    │                  │
│  └─────────────┘  └──────────────────┘                  │
│  ┌─────────────┐                                        │
│  │  Storage    │ (venue photos)                         │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

### Паттерны

| Паттерн | Реализация |
|---------|------------|
| **Server state** | React Query (staleTime: 60s, gcTime: 5m, retry: 1) |
| **Client state** | Zustand (3 stores: auth, ui, filter) |
| **Auth** | Google OAuth PKCE → Supabase Auth → профиль из `profiles` |
| **API reads** | Supabase JS SDK + PostgREST + RLS |
| **API mutations** | Edge Functions (mtgx-api) для защищённых операций |
| **Realtime** | Supabase Channels (postgres_changes) для RSVP, LFG, invites, notifications |
| **Routing** | React Router v7.2 + lazy loading + ProtectedRoute guard |
| **Styling** | Tailwind CSS v4 (CSS-based config) + Radix UI + cn() utility |
| **i18n** | i18next + browser language detector + 4 namespace + EN/RU |
| **PWA** | vite-plugin-pwa + Workbox (precache + runtime caching) |
| **Notifications** | Outbox pattern: trigger → outbox → poller → push + in-app |
| **RSVP integrity** | `rsvp_with_lock()` — SELECT FOR UPDATE в PostgreSQL RPC |

### Структура src/

```
src/
├── components/
│   ├── events/        # EventCard, RSVPDialog, LFG*, BigEventForm, QuickMeetupForm, ...
│   ├── players/       # PlayerCard, InvitePlayerDialog
│   ├── profile/       # AutoMatchSettings, InvitePreferencesSettings
│   ├── layout/        # AppShell, ProtectedRoute, FormLayout
│   ├── shared/        # FormatBadge, CityBadge, EmptyState, FAB, ErrorBoundary, ...
│   └── ui/            # Radix/shadcn primitives (16+ компонентов)
├── hooks/             # 14 хуков (useAuth, useEvents, useRSVP, useLFG, usePlayers, ...)
├── store/             # 3 Zustand stores (auth, ui, filter)
├── pages/             # 14 lazy-loaded страниц
├── lib/               # supabase.ts, queryClient.ts, constants.ts, utils.ts
├── types/             # database.types.ts (16 enums, 16 table types, RPC types)
├── locales/           # en/ + ru/ (4 namespace: common, events, profile, venue)
├── test/              # setup.ts, renderWithProviders.tsx, mocks/
├── App.tsx            # Root + useAuthListener
├── router.tsx         # React Router config
├── main.tsx           # Entry point
├── sw.ts              # Service Worker
└── index.css          # Tailwind v4 theme
```

---

## 4. Маршрутизация и страницы

### Таблица маршрутов

| Маршрут | Компонент | Доступ | Назначение |
|---------|-----------|--------|------------|
| `/login` | LoginPage | Публичный | Google OAuth вход |
| `/onboarding` | OnboardingPage | Auth | 4-шаговый онбординг |
| `/` | EventFeedPage | Auth + Profile | Лента событий |
| `/events/:id` | EventDetailPage | Auth + Profile | Детали события + RSVP |
| `/events/new` | CreateEventPage | Auth + Profile | Создание Big/Quick события |
| `/players` | PlayersDirectoryPage | Auth + Profile | Каталог игроков |
| `/clubs` | ClubsPage | Auth + Profile | Заглушка "Coming Soon" |
| `/profile` | ProfilePage | Auth + Profile | Свой профиль |
| `/profile/:userId` | ProfilePage | Auth + Profile | Профиль другого игрока |
| `/profile/edit` | ProfileEditPage | Auth + Profile | Редактирование профиля |
| `/venues/:id` | VenuePage | Auth + Profile | Информация о площадке |
| `/notifications` | NotificationsPage | Auth + Profile | Уведомления + приглашения |
| `/settings` | SettingsPage | Auth + Profile | Язык, push, подписки, выход |
| `/admin` | AdminPage | Auth + Profile + Admin | Админ-панель |
| `*` | NotFoundPage | Auth + Profile | 404 |

### Защита маршрутов (ProtectedRoute)

```
Loading (auth) → Spinner
Not authenticated → /login
Authenticated + no profile → /onboarding
Authenticated + profile → render children
```

### Lazy loading

Все страницы загружаются через `React.lazy()` + `<Suspense>` с fallback skeleton.

---

## 5. Компоненты

### 5.1. Layout (3 компонента)

| Компонент | Назначение |
|-----------|------------|
| **AppShell** | Основной layout: desktop sidebar + mobile header + bottom nav + Outlet |
| **ProtectedRoute** | Auth guard с redirect logic |
| **FormLayout** | Wrapper для форм (max-w-lg, centered) |

**AppShell навигация:**
- Home, Players, Clubs, Create (+), Profile, Settings
- Admin (только для role=admin)
- NotificationBell с badge count

### 5.2. Events (13 компонентов)

| Компонент | Props | Назначение |
|-----------|-------|------------|
| **EventCard** | event | Карточка события: format, title, date, venue, going count, spots |
| **RSVPButton** | eventId, currentStatus | Кнопка открытия RSVPDialog |
| **RSVPDialog** | open, onOpenChange, eventId, currentStatus | Dialog: Going/Maybe/Not Going |
| **EventTypeToggle** | value, onChange | Toggle Big Event / Quick Meetup |
| **AttendeeList** | attendees | Список участников по группам |
| **BigEventForm** | defaultValues, clonedFrom, onCreated | Форма создания Big Event |
| **QuickMeetupForm** | defaultValues, onCreated | Форма создания Quick Meetup |
| **EventFormFields** | format, city, startsAt, minPlayers + handlers | Shared поля форм |
| **LFGBanner** | — | Баннер "N players looking for game" |
| **LFGToggleButton** | — | Активация/деактивация LFG сигнала |
| **LFGSignalList** | city | Список LFG сигналов |
| **RecommendedPlayersPanel** | eventId, onDone | Рекомендации игроков после создания |
| **AvailablePlayersHint** | city, format, startsAt | Подсказка "~N available players" |

### 5.3. Shared (10 компонентов)

| Компонент | Назначение |
|-----------|------------|
| **FormatBadge** | Цветной badge формата (emerald/purple/blue/amber + fallback gray) |
| **CityBadge** | Badge с названием города |
| **EmptyState** | Иконка + заголовок + описание |
| **FAB** | Floating Action Button (mobile only) |
| **ErrorBoundary** | React error boundary с кнопкой retry |
| **NotificationBell** | Иконка с badge непрочитанных уведомлений |
| **SubscribeButton** | Subscribe/Unsubscribe кнопка |
| **WhatsAppShareButton** | Шаринг события в WhatsApp |
| **InviteNotificationCard** | Карточка приглашения с Accept/Decline |
| **ScheduleGrid** | Универсальная сетка дни × слоты с циклированием состояний |

### 5.4. Players (2 компонента)

| Компонент | Назначение |
|-----------|------------|
| **PlayerCard** | Карточка игрока: аватар, форматы, mini availability, reliability |
| **InvitePlayerDialog** | Dialog приглашения: выбор события, формат, сообщение |

### 5.5. Profile (2 компонента)

| Компонент | Назначение |
|-----------|------------|
| **AutoMatchSettings** | Настройки auto-match: форматы, типы событий, расписание, radius |
| **InvitePreferencesSettings** | Настройки приглашений: visibility, DND, available slots |

### 5.6. UI (16+ компонентов из Radix/shadcn)

avatar, badge, button, card, dialog, dropdown-menu, input, label, select, separator, skeleton, tabs, textarea, toast/toaster, toggle, toggle-group

---

## 6. Бизнес-логика (Hooks)

### Таблица хуков (14 штук)

| Хук | Queries | Mutations | Realtime | Назначение |
|-----|---------|-----------|----------|------------|
| **useAuth** | — | — | auth listener | Сессия, профиль, login/logout |
| **useProfile** | profile, availability | update, upsert, updateAvailability | — | Профиль и расписание |
| **useEvents** | events (infinite), event, eventRsvps | createEvent | rsvps channel | Лента, детали, создание |
| **useRSVP** | — | upsert (optimistic) | — | RSVP с оптимистичным UI |
| **useLFG** | mySignal, signals | activate, deactivate | lfg channel | LFG сигналы |
| **usePlayers** | players (infinite), availability | — | — | Директория с фильтрами |
| **useSubscription** | subscriptions | subscribe, unsubscribe | — | Подписки |
| **useNotifications** | notifications | markAsRead, markAllRead | notifications channel | Уведомления |
| **useInvites** | incoming, outgoing | sendInvite, respondInvite | invites channel | Приглашения |
| **useRecommendedPlayers** | recommendedPlayers (RPC) | sendBulkInvites (RPC) | — | Рекомендации |
| **useAvailablePlayersCount** | count (RPC) | — | — | Подсказка доступных |
| **useAutoMatch** | prefs | upsert | — | Auto-match настройки |
| **useInvitePreferences** | prefs | upsert, updateDnd | — | Invite preferences |
| **usePush** | — | subscribeToPush | — | Web Push API |

### Ключевые паттерны хуков

**Оптимистичные обновления (useRSVP):**
```
onMutate → cache snapshot → optimistic update UI
onError → rollback to snapshot
onSettled → invalidate cache
```

**Infinite scroll (useEvents, usePlayers):**
```
useInfiniteQuery → fetchNextPage → IntersectionObserver → sentinel
```

**Realtime (useEvents, useLFG, useNotifications, useInvites):**
```
supabase.channel("name").on("postgres_changes", ...) → invalidateQueries
```

---

## 7. State Management (Stores)

### authStore (Zustand)

```typescript
{
  session: Session | null,
  user: User | null,
  profile: Profile | null,
  isLoading: boolean,
  profileChecked: boolean,   // предотвращает "onboarding flash"
  isAuthenticated: boolean,
}
```

**Actions:** setSession, setProfile, setLoading, reset

### uiStore (Zustand)

```typescript
{
  language: string,            // "en" | "ru" (из localStorage)
  theme: "dark",               // только dark mode
  sidebarOpen: boolean,
  notificationsCount: number,  // обновляется из useNotifications
}
```

**Actions:** setLanguage, setTheme, setSidebarOpen, setNotificationsCount

### filterStore (Zustand)

```typescript
{
  format: MtgFormat | null,    // фильтр ленты событий
  city: string | null,
}
```

**Actions:** setFormat, setCity, resetFilters

---

## 8. База данных

### Таблицы (16)

| Таблица | Ключевые поля | Назначение |
|---------|---------------|------------|
| **profiles** | id (FK auth.users), display_name, city, formats[], role, reliability_score, bio, avatar_url, car_access, interested_in_trading | Профили игроков |
| **availability** | user_id, day, slot, level | Расписание доступности (7×3) |
| **venues** | id, owner_id, name, city, address, capacity, hours, contacts, supported_formats[] | Игровые площадки |
| **venue_photos** | venue_id, storage_path, is_primary | Фото площадок (Supabase Storage) |
| **events** | id, organizer_id, venue_id, type, format, city, title, starts_at, expires_at, status, min_players, max_players, fee_text, description, cloned_from | События |
| **rsvps** | event_id, user_id, status, updated_at | RSVP (unique per event+user) |
| **rsvp_history** | rsvp_id, user_id, event_id, from_status, to_status, hours_before_event | Аудит изменений RSVP |
| **looking_for_game** | user_id, city, formats[], preferred_slot, expires_at | LFG сигналы (24h) |
| **subscriptions** | user_id, target_type, target_id, format, city | Подписки на уведомления |
| **player_invites** | from_user_id, to_user_id, event_id, format, message, status | Приглашения между игроками |
| **invite_preferences** | user_id, is_open, available_slots, formats[], visibility, dnd_until | Настройки приглашений |
| **auto_match_preferences** | user_id, formats[], event_types[], match_days, radius, max_daily_notifications, is_active | Auto-match настройки |
| **push_subscriptions** | user_id, endpoint, p256dh, auth | Web Push подписки |
| **notifications** | user_id, type, title, body, is_read, event_id | In-app уведомления |
| **notification_outbox** | type, payload, status, attempts | Outbox для push/notify |
| **admin_reports** | report_date, payload (JSONB) | Ежедневные отчёты |

### Enums (16)

```
user_role: player | organizer | club_owner | admin
mtg_format: pauper | commander | standard | draft
event_type: big | quick
event_status: active | cancelled | confirmed | expired
rsvp_status: going | maybe | not_going
subscription_target: organizer | venue | format_city
day_of_week: sun | mon | tue | wed | thu | fri | sat
time_slot: morning | day | evening
availability_level: available | sometimes | unavailable
outbox_status: pending | sent | dead
car_access: yes | no | sometimes (CHECK constraint)
match_day_pref: always | if_free | never
invite_visibility: all | played_together | my_venues | none
invite_status: pending | accepted | declined | expired
match_radius: my_city | nearby | all
```

### RPC Functions (6)

| Функция | Назначение |
|---------|------------|
| `availability_match(event_id)` | Найти доступных игроков для события |
| `update_user_availability(user_id, slots)` | Транзакционное обновление расписания |
| `rsvp_with_lock(event_id, user_id, status)` | RSVP с пессимистичной блокировкой |
| `get_recommended_invites(event_id)` | Рекомендации игроков для приглашения |
| `send_bulk_invites(event_id, user_ids, message)` | Массовая отправка приглашений |
| `count_available_players(city, format, day, slot)` | Подсчёт доступных игроков |

### Триггеры

| Триггер | Таблица | Назначение |
|---------|---------|------------|
| `fn_rsvp_audit` | rsvps (AFTER UPDATE) | Запись в rsvp_history при смене статуса |
| `fn_outbox_new_event` | events (AFTER INSERT) | Создание outbox записи для нового события |
| `fn_set_quick_expire` | events (BEFORE INSERT, type='quick') | Установка expires_at = starts_at + 24h |
| `fn_set_updated_at` | rsvps, auto_match_preferences, invite_preferences | Автообновление updated_at |

### Индексы (20+)

Ключевые: `idx_profiles_formats` (GIN), `idx_events_format_city`, `idx_lfg_city_expires`, `idx_invites_to_pending`, `idx_auto_match_active` (GIN), `idx_outbox_pending`

---

## 9. API и Edge Functions

### mtgx-api — основной API (6 endpoints)

| Method | Path | Auth | Назначение |
|--------|------|------|------------|
| POST/PUT | `/rsvp` | JWT | RSVP через `rsvp_with_lock` RPC |
| POST | `/events` | JWT | Создание события (role check для big) |
| POST | `/lfg` | JWT | Активация LFG сигнала (24h) |
| POST | `/admin/assign-role` | JWT + Admin | Назначение роли пользователю |
| GET/POST | `/invites` | JWT | Список / создание приглашений |
| POST | `/invites/respond` | JWT | Accept/Decline приглашения |

**Валидации:**
- Формат в допустимых значениях
- starts_at в будущем
- Big event → role in [organizer, club_owner, admin]
- Invite → recipient.is_open, visibility check, rate limit 5/day
- RSVP → max_players check с FOR UPDATE lock

**HTTP коды:** 200, 201, 400, 401, 403, 404, 409, 429, 500

### mtgx-poller — cron jobs (7 задач)

| Job | Назначение |
|-----|------------|
| `processOutbox()` | Обработка outbox → notifications + push (50 за раз) |
| `expireQuickMeetups()` | Expire quick events по expires_at |
| `expireLfgSignals()` | Удаление истёкших LFG сигналов |
| `sendReminders()` | Напоминания за 24h до события |
| `checkMinPlayers()` | Уведомление при достижении min_players |
| `maybeGenerateDailyReport()` | Ежедневный отчёт в 08:00 UTC |
| `expireInvites()` | Expire pending invites старше 24h |

**Auth:** Bearer token с CRON_SECRET

---

## 10. Безопасность

### RLS (Row Level Security)

Каждая таблица имеет RLS policies:
- **profiles**: SELECT all, UPDATE/INSERT own. WITH CHECK блокирует изменение role и reliability_score
- **events**: SELECT active/own, INSERT role-based, UPDATE own/admin, DELETE blocked
- **rsvps**: CRUD own, SELECT all
- **rsvp_history**: только SELECT (own/admin), INSERT/UPDATE/DELETE blocked
- **notifications**: CRUD own, WITH CHECK user_id = auth.uid()
- **admin_reports**: SELECT only admin

### Security Definer Functions

Все RPC функции используют `SECURITY DEFINER` с `SET search_path = public, pg_temp`:
- `rsvp_with_lock` — проверяет auth.uid() перед операцией
- `update_user_availability` — проверяет p_user_id = auth.uid()
- `availability_match`, `get_recommended_invites`, `count_available_players` — REVOKE FROM anon

### Vercel Security Headers

```
Content-Security-Policy: strict (Google OAuth + Supabase domains)
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Auth Flow

```
Google OAuth (PKCE) → Supabase Auth → JWT → RLS policies
```

- PKCE flow предотвращает token interception
- URL параметры очищаются после callback
- Module-level flag `_listenerMounted` предотвращает двойную инициализацию

---

## 11. Интернационализация

### Настройка

- **Библиотека**: i18next + react-i18next + i18next-browser-languagedetector
- **Языки**: English (en), Russian (ru)
- **Детекция**: localStorage → navigator language → fallback "en"
- **Persistence**: localStorage ключ `i18nextLng`

### Namespaces (4)

| Namespace | Ключей | Содержание |
|-----------|--------|------------|
| **common** | ~58 | UI элементы, навигация, статусы, auth, admin |
| **events** | ~58 | Создание/просмотр событий, RSVP, LFG, фильтры |
| **profile** | ~113 | Профиль, доступность, роли, onboarding, invites, auto-match |
| **venue** | ~12 | Информация о площадке |

**Итого: ~241 ключей × 2 языка = ~482 перевода**

### Паттерн использования

```tsx
const { t } = useTranslation(["events", "common"]);
t("events:going")           // namespace prefix
t("common:save")            // другой namespace
t("key", "Fallback text")   // с fallback
t("key", { count: 5 })      // с интерполяцией
```

---

## 12. PWA и Service Worker

### Manifest

```json
{
  "name": "MTGX - MTG Meetup Platform",
  "short_name": "MTGX",
  "display": "standalone",
  "theme_color": "#1a1a2e",
  "background_color": "#1a1a2e"
}
```

### Service Worker (Workbox)

| Стратегия | URL pattern | Cache | TTL |
|-----------|-------------|-------|-----|
| **Precache** | index.html, JS/CSS bundles | WB_MANIFEST | Версионный |
| **CacheFirst** | Изображения (png/jpg/svg/webp) | image-cache | 30 дней, 100 entries |
| **NetworkFirst** | Supabase REST API (/rest/v1/) | api-cache | 5 дней, 50 entries |

### Push Notifications

```
Service Worker → push event → self.registration.showNotification()
notificationclick → clients.openWindow(data.url)
```

### Chunk Reload Recovery

Скрипт в index.html отлавливает ошибки динамического импорта:
1. Unregister все Service Workers
2. Очистить все caches
3. Reload страницу (один раз, через sessionStorage flag)

---

## 13. Тестирование

### Инфраструктура

| Компонент | Инструмент |
|-----------|------------|
| Test runner | Vitest 4.0 (globals, jsdom) |
| DOM testing | @testing-library/react + user-event |
| Assertions | @testing-library/jest-dom |
| Mocking | vi.mock() + MSW |
| Coverage | @vitest/coverage-v8 (text + lcov) |

### Тестовые файлы (12 файлов, 75 тестов)

| Файл | Тестов | Покрытие |
|------|--------|----------|
| authStore.test.ts | 9 | Все actions: setSession, setProfile, reset |
| filterStore.test.ts | 6 | setFormat, setCity, resetFilters |
| uiStore.test.ts | 8 | setLanguage, setSidebarOpen, setNotificationsCount, setTheme |
| ProtectedRoute.test.tsx | 6 | Loading, redirect /login, redirect /onboarding, render children |
| EventCard.test.tsx | 12 | Title, format, city, going count, full/spots, venue, link |
| RSVPDialog.test.tsx | 5 | 3 buttons, mutateAsync, close on success, toast on error, disabled |
| BigEventForm.test.tsx | 4 | Renders fields, city validation, max<min validation, submit |
| QuickMeetupForm.test.tsx | 5 | Renders, city validation, date validation, submit, expires_at |
| ErrorBoundary.test.tsx | 3 | Renders children, fallback on error, try again |
| FormatBadge.test.tsx | 7 | Format colors (4 formats), border-none, className merge |
| useAuth.test.ts | 4 | Store values, loginWithGoogle, logout, logout error handling |
| ProfileEditPage.test.tsx | 6 | Loading, populated fields, disabled save, whatsapp validation, save |

### Тестовая инфраструктура

- **setup.ts**: jest-dom, cleanup, IntersectionObserver mock, matchMedia mock
- **renderWithProviders.tsx**: QueryClientProvider + MemoryRouter wrapper
- **mocks/supabase.ts**: полный mock Supabase client (chainable methods)
- **mocks/fixtures.ts**: mockUser, mockSession, mockProfile, mockEvent, mockVenue

### Запуск

```bash
npm run test           # vitest run (single run)
npm run test:watch     # vitest (watch mode)
npm run test:coverage  # vitest run --coverage
```

---

## 14. Деплой и инфраструктура

### Deployment

| Компонент | Платформа |
|-----------|-----------|
| Frontend (SPA) | Vercel |
| Database + Auth | Supabase Cloud |
| Edge Functions | Supabase Edge |
| Storage | Supabase Storage |

### Environment Variables

**Client (.env):**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SENTRY_DSN
VITE_VAPID_PUBLIC_KEY
```

**Server:**
```
SUPABASE_SERVICE_ROLE_KEY
VAPID_PRIVATE_KEY
RESEND_API_KEY
ADMIN_EMAIL
CRON_SECRET
ALLOWED_ORIGIN
```

### Build Pipeline

```bash
tsc -b                 # TypeScript проверка
vite build             # → dist/ (SPA + PWA assets)
```

**Output**: ~638 KB JS (gzip: ~194 KB) + Service Worker + Workbox

### Локальная разработка

```bash
npm run dev                          # Vite dev server → localhost:5173
supabase start                       # Локальная БД → localhost:54321
supabase db reset                    # Пересоздать БД из миграций + seed
supabase functions serve mtgx-api    # Edge Functions локально
```

### Seed Data

3 профиля (player/organizer/admin), 1 площадка, 3 события, 5 RSVP, 3 подписки.

---

## Статистика проекта

| Метрика | Значение |
|---------|----------|
| Страниц | 14 |
| Компонентов | 45+ |
| Хуков | 14 |
| Stores | 3 |
| Таблиц БД | 16 |
| RPC функций | 6 |
| Триггеров | 4 |
| Миграций | 10 |
| API endpoints | 6 |
| Cron jobs | 7 |
| Тестов | 75 |
| Тестовых файлов | 12 |
| i18n ключей | ~241 × 2 языка |
| UI компонентов (Radix) | 16+ |
| Dependencies | 22 |
| DevDependencies | 13 |
