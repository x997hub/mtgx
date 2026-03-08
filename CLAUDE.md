# MTGX — MTG Social Platform

## Язык общения

Всегда общайся с пользователем на русском языке.

## Команды

```bash
npm run dev          # Dev сервер → localhost:5173
npm run build        # tsc -b && vite build → dist/
npm run preview      # Превью продакшн-сборки
npm run typecheck    # tsc -b --noEmit
npm run lint         # eslint src/
```

Supabase:
```bash
supabase start                    # Локальная БД на localhost:54321
supabase db reset                 # Пересоздать БД из миграций + seed
supabase functions serve mtgx-api # Локально запустить Edge Functions
supabase functions deploy         # Деплой Edge Functions
```

## Архитектура

**Frontend:** React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + Radix UI
**Backend:** Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
**Deploy:** Vercel (SPA) + Supabase Cloud

### Структура src/

```
components/    # По доменам: events/, players/, profile/, venue/, layout/, shared/, ui/
hooks/         # Бизнес-логика: useEvents, useRSVP, useLFG, useAuth, useProfile, usePlayers, useVenues
store/         # Zustand: authStore (сессия/профиль), uiStore (язык/тема), filterStore
pages/         # Lazy-loaded через React.lazy()
lib/           # supabase.ts (клиент), queryClient.ts, constants.ts, utils.ts
types/         # database.types.ts — типы из Supabase схемы
locales/       # i18n: en/ и ru/ (пространства: common, events, profile, venue)
```

### Ключевые паттерны

- **State:** Zustand для UI-стейта, React Query для серверного (staleTime: 60s, gcTime: 5m)
- **API:** Supabase JS SDK + RLS для чтения, Edge Functions для защищённых мутаций
- **Auth:** Google OAuth через PKCE → профиль из `profiles` → redirect на /onboarding если нет профиля
- **Routing:** React Router v7.2 с lazy loading; ProtectedRoute для авторизованных страниц
- **Realtime:** Supabase channels (postgres_changes) для событий и RSVP
- **i18n:** i18next с автодетектом языка; namespace per domain
- **PWA:** Workbox (image-cache 60 дней), auto-update с skipWaiting
- **Стили:** `cn()` = clsx + tailwind-merge; Radix UI примитивы

### Path alias

`@/*` → `src/*` (настроено в tsconfig и vite)

## Supabase Schema

**Основные таблицы:** profiles, events, rsvps, rsvp_history, venues, venue_photos, availability, subscriptions, looking_for_game, outbox

**Enums:** user_role (player/organizer/club_owner/admin), mtg_format (pauper/commander/standard/draft), event_type (big/quick), time_slot (morning/day/evening), day_of_week, availability_level, event_status, rsvp_status

**Edge Functions (Deno):**
- `mtgx-api` — RSVP (через RPC `rsvp_with_lock`), создание событий, LFG, admin/assign-role
- `mtgx-poller` — cron: outbox processing, expiry, напоминания, daily report

Миграции: `supabase/migrations/` (8 файлов, хронологически)

## Environment

**Client (.env):**
```
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SENTRY_DSN, VITE_VAPID_PUBLIC_KEY
```

**Server (Edge Functions / Vercel):**
```
SUPABASE_SERVICE_ROLE_KEY, VAPID_PRIVATE_KEY, RESEND_API_KEY, ADMIN_EMAIL, CRON_SECRET
```

## Gotchas

- **useAuthListener** использует module-level флаг `_listenerMounted` — вызывать только один раз в App.tsx
- **RSVP** использует пессимистичную блокировку через PostgreSQL RPC (`rsvp_with_lock`), не обычный insert
- **Chunk reload recovery** — в index.html есть скрипт перезагрузки при ошибке загрузки модуля
- **OAuth callback** — URL параметры очищаются после обработки (access_token, refresh_token)
- **Нижний padding** — на главной странице `pb-20 md:pb-6` из-за мобильной навигации
- **database.types.ts** — ручное описание типов (не автогенерация supabase gen types)
- **ESLint:** no-explicit-any и no-unused-vars = warn; `^_` prefixed vars игнорируются
- **Tailwind v4** — используется CSS-based конфигурация (@import), не JS config

## Workflow

- **Всегда пушить по завершению задачи** — после коммита сразу `git push`

## Code Style

- Компоненты: PascalCase. Хуки/утилиты: camelCase. ESM (`"type": "module"`)
- Импорты: React → external libs → `@/` local imports
- TypeScript strict mode. JSX: react-jsx
