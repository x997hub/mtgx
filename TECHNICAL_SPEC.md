# MTG Meetup Platform — Техническое задание

**Версия:** 1.0
**Дата:** 2026-03-04
**Статус:** Утверждено (Expert Panel, 4 раунда дебатов, confidence 8.5/10)

---

## 1. Обзор проекта

Веб-платформа для MTG-игроков в Израиле. Помогает находить игры и заполнять столы. Не соцсеть — инструмент матчмейкинга и координации событий.

| Параметр | Значение |
|----------|----------|
| Стек | React 19 + TypeScript + Vite + Supabase + Vercel |
| Авторизация | Google OAuth only (Supabase Auth) |
| Языки | EN (default) + RU (i18n файл), иврит позже |
| RTL | Нет в MVP |
| PWA | Да (push-уведомления) |
| Целевая аудитория | MTG-игроки в Израиле, старт с Pauper-сообщества |

---

## 2. Фазы проекта

### Фаза 1 — MVP (Pauper-пилот)

**Цель:** 15-20 зарегистрированных игроков, минимум 3 события через платформу.

**Включено:**
- Google OAuth + профиль игрока
- Сетка доступности (chip-selector при онбординге, полная сетка в профиле)
- Лента событий с фильтрами по формату/городу
- Создание событий: большое мероприятие (организатор) + быстрая встреча (любой)
- RSVP с 3 статусами (иду / может быть / не иду)
- Сигнал «ищу игру» (24ч auto-expire)
- Подписки на организатора / venue / формат+город
- Push-уведомления через outbox + PWA
- Дедупликация уведомлений
- Напоминания за 24ч
- Clone event (кнопка «повторить мероприятие»)
- Публичная страница venue
- Трекинг надёжности игрока (видно организаторам)
- Отдельная админ-панель + ежедневный отчёт
- i18n EN + RU

**Исключено из MVP:**
- Календарь клуба с резервацией слотов
- Recurring events (шаблоны + rrule)
- Карты / геолокация
- Радиус готовности ехать
- Нативное приложение
- Иврит / RTL
- Монетизация / платежи
- WhatsApp / Telegram боты

### Фаза 2 — Интеграция с клубами

- Календарь клуба (недельный/месячный вид)
- Резервация слотов (блокировка времени под мероприятие)
- Блокировка быстрых встреч в занятых слотах
- Recurring events (шаблоны + rrule + автогенерация)
- Расширенный список форматов
- WhatsApp бот для уведомлений
- Подготовка к ивриту

### Фаза 3 — Масштабирование

- Google Maps интеграция
- Фильтр по радиусу готовности ехать
- Иврит + RTL layout
- Нативное приложение (Capacitor или React Native)
- Telegram бот
- Монетизация (подписки для клубов, продвигаемые события)

---

## 3. Роли пользователей

| Роль | Назначение | Возможности |
|------|------------|-------------|
| **Player** | По умолчанию при регистрации | Профиль, RSVP, LFG сигнал, создание быстрых встреч, подписки |
| **Organizer** | Назначает Admin | Всё что Player + создание больших мероприятий, RSVP dashboard с reliability |
| **Club Owner** | Назначает Admin | Всё что Organizer + управление venue, публичная страница клуба |
| **Admin** | Фаундер | Назначение ролей, модерация, ежедневные отчёты, управление форматами/городами |

Один человек может совмещать роли (например, Club Owner + Organizer).

---

## 4. User Stories

### Player

| # | Story | Acceptance Criteria |
|---|-------|---------------------|
| P1 | Регистрация через Google OAuth | < 60с от клика до ленты событий |
| P2 | Заполнение профиля (город, форматы, доступность) | Доступность опциональна при онбординге |
| P3 | Просмотр ленты событий с фильтрами | Фильтр по формату + городу, бесконечный скролл |
| P4 | RSVP на событие (иду / может быть / не иду) | Счётчик обновляется realtime, оптимистичный UI |
| P5 | Активация «ищу игру» | Сигнал виден в ленте по venue, auto-expire 24ч |
| P6 | Создание быстрой встречи | 3-4 поля, авто-приглашения по доступности |
| P7 | Подписка на организатора/venue/формат+город | Управление в настройках профиля |
| P8 | Получение push-уведомлений | Dedup: 1 уведомление на event, напоминание за 24ч |
| P9 | Шеринг события в WhatsApp | Ссылка на событие копируется в один тап |
| P10 | Просмотр кто записался на событие | Имена, профили, контакты участников видны |
| P11 | Отмена RSVP в любой момент | Фиксация в rsvp_history для reliability score |

### Organizer

| # | Story | Acceptance Criteria |
|---|-------|---------------------|
| O1 | Создание большого мероприятия | Полная форма: название, формат, дата/время, venue, мин/макс, fee (текст), описание |
| O2 | Просмотр RSVP dashboard | Going/Maybe/Not going счётчики, reliability score игроков |
| O3 | Получение уведомления при наборе минимума | Push «Игра состоится!» всем going |
| O4 | Clone event (повторить мероприятие) | Pre-filled форма, новая дата/время, чистый RSVP |
| O5 | Отмена мероприятия | Статус → cancelled, уведомление всем RSVP |

### Club Owner

| # | Story | Acceptance Criteria |
|---|-------|---------------------|
| V1 | Создание и редактирование профиля venue | Название, адрес, город, часы работы, вместимость, контакты, форматы |
| V2 | Публичная страница клуба | Предстоящие события, кнопка подписки, инфо |
| V3 | Загрузка фото venue | Supabase Storage, публичный доступ |

### Admin

| # | Story | Acceptance Criteria |
|---|-------|---------------------|
| A1 | Назначение роли пользователю | Смена player → organizer / club_owner |
| A2 | Ежедневный отчёт | Новые юзеры, события, RSVP, отмены, low reliability |
| A3 | Просмотр всех событий и юзеров | Отдельная админ-панель |

---

## 5. Архитектура системы

### 5.1 Компоненты

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│  React 19 SPA   │────▶│         Supabase                     │
│  (Vercel CDN)   │     │                                      │
│                 │     │  ┌─────────┐  ┌────────────────────┐ │
│  - TanStack Q.  │◀───▶│  │  Auth   │  │    PostgreSQL 15   │ │
│  - Zustand      │     │  │ (Google)│  │  (RLS enabled)     │ │
│  - shadcn/ui    │     │  └─────────┘  └────────────────────┘ │
│  - i18next      │     │                                      │
│  - Service Worker│     │  ┌─────────┐  ┌────────────────────┐ │
│                 │◀───▶│  │Realtime │  │  Edge Functions     │ │
│                 │     │  │(rsvps,  │  │  - mtgx-api        │ │
│                 │     │  │ lfg)    │  │  - mtgx-poller     │ │
│                 │     │  └─────────┘  └────────────────────┘ │
│                 │     │                                      │
│                 │     │  ┌─────────┐  ┌────────────────────┐ │
│                 │     │  │ Storage │  │     pg_cron        │ │
│                 │     │  │ (photos)│  │  (triggers poller) │ │
│                 │     │  └─────────┘  └────────────────────┘ │
└─────────────────┘     └──────────────────────────────────────┘
```

### 5.2 Supabase Services

| Сервис | Назначение |
|--------|------------|
| **Auth** | Google OAuth, JWT, session management |
| **Database** | PostgreSQL 15, все таблицы + RLS + triggers |
| **Realtime** | Live-обновления RSVP счётчиков + LFG сигналов |
| **Edge Functions** | 2 функции: бизнес-логика + фоновые задачи |
| **Storage** | Фото venues (bucket `venue-images`, public read) |
| **pg_cron** | Расписание для poller (каждую минуту) |

### 5.3 Edge Functions

**`mtgx-api`** — обработка запросов:
- `POST /rsvp` — pessimistic lock + insert RSVP + write outbox
- `POST /events` — создание события + запись в outbox для уведомлений
- `POST /lfg` — создание/обновление LFG сигнала
- `POST /admin/assign-role` — назначение роли (только admin)

**`mtgx-poller`** — фоновые задачи (вызывается pg_cron каждую минуту):
- Отправка push-уведомлений из outbox (retry до 3 раз)
- Expire quick meetups (`expires_at < now()`)
- Expire LFG сигналов (`expires_at < now()`)
- Напоминания за 24ч
- Проверка min_players достижения
- Генерация ежедневного отчёта (в 08:00)

### 5.4 Notification Pipeline (Outbox Pattern)

```
1. Событие создано → DB trigger → INSERT INTO notification_outbox
2. pg_cron каждую минуту → вызывает mtgx-poller
3. mtgx-poller:
   a. SELECT * FROM notification_outbox WHERE status = 'pending' AND attempts < 3
   b. Для каждого: определить получателей (subscriptions + availability match + dedup)
   c. Отправить Web Push
   d. UPDATE status = 'sent' / INCREMENT attempts
   e. После 3 failed attempts: status = 'dead', alert в Sentry
```

**Дедупликация:** Таблица `notification_sent` с PK `(user_id, event_id)`. Один пользователь получает максимум одно уведомление на событие, независимо от количества совпавших подписок.

**Приоритет уведомлений:**
- Подписка на организатора/venue → push всегда
- Подписка на формат+город → push только если доступность совпадает с временем события

### 5.5 Realtime Strategy

| Данные | Метод | Обоснование |
|--------|-------|-------------|
| RSVP счётчик на странице события | Supabase Realtime | Высокая UX ценность, low cardinality |
| LFG сигналы в ленте | Supabase Realtime | Live social signal |
| Уведомления (bell) | Supabase Realtime на notifications | In-app badge |
| Лента событий | Polling каждые 60с (TanStack Query refetchInterval) | Слишком широко для realtime |

---

## 6. База данных

### 6.1 Схема

```sql
-- ==========================================
-- ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM ('player', 'organizer', 'club_owner', 'admin');
CREATE TYPE mtg_format AS ENUM ('pauper', 'commander', 'standard', 'draft');
CREATE TYPE event_type AS ENUM ('big', 'quick');
CREATE TYPE event_status AS ENUM ('active', 'cancelled', 'confirmed', 'expired');
CREATE TYPE rsvp_status AS ENUM ('going', 'maybe', 'not_going');
CREATE TYPE subscription_target AS ENUM ('organizer', 'venue', 'format_city');
CREATE TYPE day_of_week AS ENUM ('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat');
CREATE TYPE time_slot AS ENUM ('day', 'evening');
CREATE TYPE availability_level AS ENUM ('available', 'sometimes', 'unavailable');
CREATE TYPE outbox_status AS ENUM ('pending', 'sent', 'dead');

-- ==========================================
-- PROFILES (extends auth.users)
-- ==========================================
CREATE TABLE public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name   TEXT NOT NULL,
  city           TEXT NOT NULL,
  formats        mtg_format[] NOT NULL DEFAULT '{}',
  whatsapp       TEXT,
  role           user_role NOT NULL DEFAULT 'player',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_profiles_formats ON profiles USING GIN(formats);

-- ==========================================
-- AVAILABILITY (14 rows per user: 7 days × 2 slots)
-- ==========================================
CREATE TABLE public.availability (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day        day_of_week NOT NULL,
  slot       time_slot NOT NULL,
  level      availability_level NOT NULL DEFAULT 'unavailable',
  UNIQUE(user_id, day, slot)
);

CREATE INDEX idx_availability_user ON availability(user_id);
CREATE INDEX idx_availability_match ON availability(day, slot, level)
  WHERE level IN ('available', 'sometimes');

-- ==========================================
-- VENUES
-- ==========================================
CREATE TABLE public.venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES profiles(id),
  name            TEXT NOT NULL,
  city            TEXT NOT NULL,
  address         TEXT NOT NULL,
  hours           JSONB,
  capacity        INT,
  contacts        JSONB,
  supported_formats mtg_format[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venues_city ON venues(city);

-- ==========================================
-- VENUE PHOTOS
-- ==========================================
CREATE TABLE public.venue_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id     UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  is_primary   BOOLEAN DEFAULT false
);

-- ==========================================
-- EVENTS
-- ==========================================
CREATE TABLE public.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id    UUID NOT NULL REFERENCES profiles(id),
  venue_id        UUID REFERENCES venues(id),
  type            event_type NOT NULL,
  title           TEXT,
  format          mtg_format NOT NULL,
  city            TEXT NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  duration_min    INT,
  min_players     INT DEFAULT 2,
  max_players     INT,
  fee_text        TEXT,                    -- информационное поле, не платёж
  description     TEXT,
  status          event_status NOT NULL DEFAULT 'active',
  cloned_from     UUID REFERENCES events(id), -- для clone button
  expires_at      TIMESTAMPTZ,             -- quick meetups: auto-expire
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_starts_at ON events(starts_at) WHERE status = 'active';
CREATE INDEX idx_events_format_city ON events(format, city) WHERE status = 'active';
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_venue ON events(venue_id);
CREATE INDEX idx_events_expires ON events(expires_at) WHERE expires_at IS NOT NULL AND status = 'active';

-- ==========================================
-- RSVPs
-- ==========================================
CREATE TABLE public.rsvps (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     rsvp_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_rsvps_event ON rsvps(event_id);
CREATE INDEX idx_rsvps_user ON rsvps(user_id);

-- ==========================================
-- RSVP HISTORY (аудит для reliability score)
-- ==========================================
CREATE TABLE public.rsvp_history (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rsvp_id         BIGINT NOT NULL REFERENCES rsvps(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id),
  event_id        UUID NOT NULL REFERENCES events(id),
  from_status     rsvp_status,
  to_status       rsvp_status NOT NULL,
  hours_before_event NUMERIC,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rsvp_history_user ON rsvp_history(user_id);

-- ==========================================
-- SUBSCRIPTIONS
-- ==========================================
CREATE TABLE public.subscriptions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type subscription_target NOT NULL,
  target_id   UUID,              -- organizer_id или venue_id; NULL для format_city
  format      mtg_format,        -- для format_city
  city        TEXT,              -- для format_city
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type, target_id, format, city)
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_target ON subscriptions(target_type, target_id);

-- ==========================================
-- LOOKING FOR GAME (сигнал «ищу игру»)
-- ==========================================
CREATE TABLE public.looking_for_game (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  city       TEXT NOT NULL,
  formats    mtg_format[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lfg_city_expires ON looking_for_game(city, expires_at);

-- ==========================================
-- PUSH SUBSCRIPTIONS (Web Push API)
-- ==========================================
CREATE TABLE public.push_subscriptions (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh   TEXT NOT NULL,
  auth     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- NOTIFICATION OUTBOX (заменяет pg_net)
-- ==========================================
CREATE TABLE public.notification_outbox (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID REFERENCES events(id) ON DELETE SET NULL,
  type       TEXT NOT NULL,      -- 'new_event', 'min_reached', 'reminder', 'event_cancelled', 'lfg_match'
  payload    JSONB NOT NULL,
  status     outbox_status NOT NULL DEFAULT 'pending',
  attempts   INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbox_pending ON notification_outbox(created_at)
  WHERE status = 'pending';

-- ==========================================
-- NOTIFICATION SENT (дедупликация)
-- ==========================================
CREATE TABLE public.notification_sent (
  user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reason   TEXT NOT NULL,
  sent_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, event_id)
);

-- ==========================================
-- NOTIFICATIONS (in-app)
-- ==========================================
CREATE TABLE public.notifications (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  type     TEXT NOT NULL,
  title    TEXT NOT NULL,
  body     TEXT NOT NULL,
  is_read  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ==========================================
-- ADMIN REPORTS
-- ==========================================
CREATE TABLE public.admin_reports (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.2 RLS Policies

```sql
-- PROFILES: read all, write own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_write_own" ON profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- AVAILABILITY: read all, write own
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avail_read_all" ON availability FOR SELECT USING (true);
CREATE POLICY "avail_write_own" ON availability FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- EVENTS: read active + own cancelled, insert by role, update own
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_read" ON events FOR SELECT
  USING (status != 'cancelled' OR organizer_id = auth.uid());
-- big events: organizer/club_owner/admin
CREATE POLICY "events_insert_big" ON events FOR INSERT
  WITH CHECK (
    auth.uid() = organizer_id
    AND (type = 'quick' OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('organizer', 'club_owner', 'admin')
    ))
  );
CREATE POLICY "events_update_own" ON events FOR UPDATE
  USING (organizer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- RSVPS: read all, write own
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rsvps_read_all" ON rsvps FOR SELECT USING (true);
CREATE POLICY "rsvps_write_own" ON rsvps FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- VENUES: read all, write by owner/admin
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venues_read_all" ON venues FOR SELECT USING (true);
CREATE POLICY "venues_write_owner" ON venues FOR ALL
  USING (owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- SUBSCRIPTIONS: own only
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_own" ON subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- LOOKING FOR GAME: read active, write own
ALTER TABLE looking_for_game ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lfg_read_active" ON looking_for_game FOR SELECT
  USING (expires_at > now());
CREATE POLICY "lfg_write_own" ON looking_for_game FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- NOTIFICATIONS: own only
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON notifications FOR ALL
  USING (auth.uid() = user_id);

-- PUSH SUBSCRIPTIONS: own only
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_own" ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### 6.3 Database Triggers

```sql
-- RSVP history audit (синхронный — решение дебатов)
CREATE OR REPLACE FUNCTION fn_rsvp_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO rsvp_history(rsvp_id, user_id, event_id, from_status, to_status, hours_before_event)
  SELECT NEW.id, NEW.user_id, NEW.event_id, OLD.status, NEW.status,
    EXTRACT(EPOCH FROM (e.starts_at - now())) / 3600
  FROM events e WHERE e.id = NEW.event_id;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_rsvp_audit AFTER UPDATE ON rsvps
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION fn_rsvp_audit();

-- Notification outbox: new event created
CREATE OR REPLACE FUNCTION fn_outbox_new_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notification_outbox(event_id, type, payload)
  VALUES (NEW.id, 'new_event', jsonb_build_object(
    'event_id', NEW.id,
    'format', NEW.format,
    'city', NEW.city,
    'organizer_id', NEW.organizer_id,
    'venue_id', NEW.venue_id,
    'starts_at', NEW.starts_at
  ));
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_outbox_new_event AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION fn_outbox_new_event();

-- Event creation: set expires_at for quick meetups
CREATE OR REPLACE FUNCTION fn_set_quick_expire() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type = 'quick' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.starts_at + interval '24 hours';
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_set_quick_expire BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION fn_set_quick_expire();
```

### 6.4 max_players — Pessimistic Lock

```sql
-- Выполняется в mtgx-api Edge Function
-- Одна транзакция: lock → check → insert
BEGIN;
  -- Lock строку события
  SELECT id, max_players FROM events WHERE id = $1 FOR UPDATE;

  -- Проверить количество going
  SELECT COUNT(*) AS going_count FROM rsvps
  WHERE event_id = $1 AND status = 'going';

  -- Если going_count >= max_players → ROLLBACK и вернуть ошибку "event full"
  -- Иначе → INSERT/UPSERT в rsvps
  INSERT INTO rsvps (event_id, user_id, status)
  VALUES ($1, $2, $3)
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = $3, updated_at = now();
COMMIT;
```

### 6.5 Availability Matching

```sql
-- Вызывается при обработке outbox записи типа 'new_event'
CREATE OR REPLACE FUNCTION availability_match(p_event_id UUID)
RETURNS TABLE(user_id UUID) AS $$
DECLARE
  v_event events%ROWTYPE;
  v_dow   day_of_week;
  v_slot  time_slot;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id;

  -- Определить день недели (Supabase PostgreSQL)
  v_dow := CASE EXTRACT(DOW FROM v_event.starts_at)
    WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue'
    WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri'
    WHEN 6 THEN 'sat'
  END::day_of_week;

  -- День/вечер (до/после 17:00)
  v_slot := CASE WHEN EXTRACT(HOUR FROM v_event.starts_at) < 17
    THEN 'day' ELSE 'evening' END::time_slot;

  RETURN QUERY
  SELECT DISTINCT p.id
  FROM profiles p
  JOIN availability a ON a.user_id = p.id
    AND a.day = v_dow
    AND a.slot = v_slot
    AND a.level IN ('available', 'sometimes')
  WHERE v_event.format = ANY(p.formats)
    AND p.city = v_event.city
    AND p.id != v_event.organizer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.6 Reliability Score

**Формула** (rolling 6 месяцев):

```
penalty =
  2.0  если отменил going < 24ч до события
  1.0  если отменил going > 24ч до события

reliability = MAX(0, 1 - SUM(penalties) / COUNT(going_commitments))
default = 1.000 (нет истории)
```

Вычисляется через trigger на `rsvp_history`. Хранится на `profiles` как `reliability_score NUMERIC(4,3)`. Видна только организаторам и админам.

### 6.7 pg_cron Jobs

```sql
-- Запуск mtgx-poller каждую минуту
SELECT cron.schedule('run-poller', '* * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/mtgx-poller',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);
```

---

## 7. Frontend

### 7.1 Стек

| Инструмент | Версия | Назначение |
|------------|--------|------------|
| React | 19 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool |
| React Router | 7.x | Routing (SPA) |
| TanStack Query | 5.x | Server state, кеширование, polling |
| Zustand | 4.x | Client state (auth, filters, UI) |
| shadcn/ui | 2.x | UI компоненты (Radix + Tailwind) |
| Tailwind CSS | 4.x | Styling |
| i18next + react-i18next | 23/14 | Интернационализация |
| vite-plugin-pwa | 0.20 | PWA + Service Worker |

### 7.2 Экраны

| Route | Экран | Основные компоненты |
|-------|-------|---------------------|
| `/` | Лента событий | EventCard, FormatFilter, CityFilter, LFGBanner, FAB «Хочу поиграть» |
| `/events/:id` | Страница события | RSVPButton, AttendeeList, WhatsAppShareButton, EventCountdown |
| `/events/new` | Создание события | EventTypeToggle, BigEventForm, QuickMeetupForm |
| `/profile` | Мой профиль | AvailabilityGrid, FormatPicker, SubscriptionList |
| `/profile/edit` | Редактирование профиля | CitySelect, FormatMultiSelect, AvailabilityGrid, WhatsAppInput |
| `/venues/:id` | Публичная страница venue | VenueHeader, UpcomingEvents, SubscribeButton, VenueInfo |
| `/onboarding` | Онбординг | CityStep, FormatsStep, AvailabilityChips (skip), SubscribeSuggest |
| `/login` | Авторизация | GoogleOAuthButton |
| `/settings` | Настройки | LanguageSwitcher, PushPermissions, SubscriptionManager |
| `/admin` | Админ-панель | DailyReport, UserTable, RoleAssignment |

### 7.3 Responsive Strategy

- **Mobile-first** (основная аудитория)
- Bottom navigation на мобильных → sidebar на десктопе (`md: 768px`)
- Лента: 1 колонка → 2 на `md` → 3 на `lg`
- FAB «Хочу поиграть»: fixed bottom-right на мобильных, inline в sidebar на десктопе
- Создание события: full-screen modal на мобильных, drawer на десктопе
- Min tap target: 44×44px

### 7.4 Онбординг (< 60с)

1. **Login** → Google OAuth (1 тап)
2. **CityStep** → Select города, auto-advance
3. **FormatsStep** → Chip multi-select форматов, кнопка «Next»
4. **AvailabilityStep** → Chip-selector (дни недели × день/вечер), **«Skip» prominent**
5. **SubscribeSuggest** → Pre-filled venues/организаторы для подписки, «Done» → лента

### 7.5 Empty State (Day 1)

```
┌──────────────────────────────────┐
│  🎴 No matches yet               │
│                                  │
│  Your availability:              │
│  [Thu eve] [Sat day] [Sat eve]   │
│                                  │
│  [Browse all events]  (primary)  │
│  [Edit availability]  (secondary)│
│                                  │
│  Or invite friends:              │
│  [Share link 📋]                 │
└──────────────────────────────────┘
```

### 7.6 RSVP Flow

1. Пользователь нажимает `RSVPButton` на карточке/странице события
2. Открывается `RSVPDialog` с 3 опциями: Going / Maybe / Cancel
3. **Optimistic update** — счётчик обновляется мгновенно
4. Мутация через TanStack Query → Supabase Edge Function (pessimistic lock)
5. При ошибке (event full / network error) — rollback к предыдущему состоянию
6. **Supabase Realtime** обновляет счётчик у других пользователей на той же странице

### 7.7 Clone Event Flow

1. Организатор нажимает «Clone» на странице прошедшего события
2. Открывается форма создания с pre-filled полями (title, format, venue, description, min/max)
3. Дата/время очищены — нужно выбрать заново
4. Публикация → новое событие с `cloned_from` ссылкой, чистый RSVP

### 7.8 i18n

```
src/locales/
  en/
    common.json    # кнопки, навигация, общие лейблы
    events.json    # создание события, RSVP
    profile.json   # доступность, форматы
    venue.json     # страница клуба
  ru/
    common.json
    events.json
    profile.json
    venue.json
```

Язык по умолчанию: EN. Переключатель в настройках. Сохранение в `localStorage`.
Fallback: если ключ не найден в RU → показать EN.

### 7.9 PWA

- **Service Worker:** vite-plugin-pwa + Workbox
- **Strategy:** NetworkFirst для API, CacheFirst для assets
- **Manifest:** `display: standalone`, `theme_color: #1a1a2e`
- **Push flow:**
  1. После онбординга → `PushPermissionPrompt` с объяснением ценности
  2. `Notification.requestPermission()`
  3. На grant: `pushManager.subscribe()` с VAPID key
  4. Endpoint сохраняется в `push_subscriptions`
  5. На deny: fallback — только in-app уведомления
- **Offline:** кешированная лента с `OfflineBanner`, RSVP заблокирован

### 7.10 Performance Budget

| Метрика | Target |
|---------|--------|
| LCP | < 2.5s на 3G |
| INP | < 100ms |
| Initial JS bundle | < 150KB gzipped |
| Route chunks | < 50KB each |
| Fonts | System font stack (0 custom fonts) |

---

## 8. DevOps и инфраструктура

### 8.1 Структура проекта

```
mtgx/
├── .github/
│   └── workflows/
│       ├── ci.yml              # lint + typecheck + test + deploy
│       └── keepalive.yml       # ping Supabase every 6 days
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn primitives
│   │   ├── layout/             # AppShell, FormLayout, etc.
│   │   ├── events/             # EventCard, RSVPButton, etc.
│   │   ├── profile/            # AvailabilityGrid, FormatPicker
│   │   ├── venue/              # VenueHeader, WeeklyCalendar
│   │   └── shared/             # WhatsAppShareButton, FormatBadge
│   ├── pages/                  # route-level components
│   ├── hooks/                  # useRSVP, useSubscription, usePush
│   ├── lib/                    # supabase client, queryClient
│   ├── store/                  # Zustand: auth, filters, UI
│   ├── types/
│   │   └── database.types.ts   # generated by supabase gen types
│   └── locales/
│       ├── en/
│       └── ru/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 20260304000000_initial_schema.sql
│   ├── seed.sql
│   └── functions/
│       ├── mtgx-api/
│       └── mtgx-poller/
├── public/
│   └── manifest.webmanifest
├── vite.config.ts
├── vercel.json
├── .env.example
└── package.json
```

### 8.2 CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test

  deploy-prod:
    needs: ci
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db push --db-url ${{ secrets.SUPABASE_PROD_DB_URL }}
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
```

### 8.3 Keepalive (предотвращение Supabase auto-pause)

```yaml
# .github/workflows/keepalive.yml
name: Keepalive
on:
  schedule:
    - cron: '0 12 */6 * *'   # каждые 6 дней

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -s "${{ secrets.SUPABASE_URL }}/rest/v1/" -H "apikey:${{ secrets.SUPABASE_ANON_KEY }}"
```

### 8.4 Environment Variables

```bash
# .env.example
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_SENTRY_DSN=<dsn>
VITE_VAPID_PUBLIC_KEY=<public>

# Server-side only (Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=<service_key>
VAPID_PRIVATE_KEY=<private>
RESEND_API_KEY=<key>
ADMIN_EMAIL=<email>
```

### 8.5 Мониторинг

| Слой | Инструмент | Что мониторим |
|------|-----------|---------------|
| Frontend | Sentry (free) | JS exceptions, failed push |
| Performance | Vercel Speed Insights | Core Web Vitals |
| DB | Supabase Dashboard | Slow queries, RLS errors |
| Edge Functions | Supabase Dashboard | Poller failures, push errors |
| Uptime | UptimeRobot (free) | Ping prod URL каждые 5 мин |

### 8.6 Локальная разработка

```bash
npm install
supabase start                    # Local Postgres + Auth + Storage
supabase db reset                 # Migrations + seed.sql
supabase gen types typescript --local > src/types/database.types.ts
cp .env.example .env.local        # Заполнить local URLs
npm run dev                       # Vite :5173
```

`seed.sql` создаёт: 2 тестовых юзера (player + organizer), 1 venue (Rotemz), 3 события, sample RSVPs.

---

## 9. Тестирование

### 9.1 Стратегия

| Тип | Инструмент | Доля | Фокус |
|-----|-----------|------|-------|
| Unit | Vitest + React Testing Library | 60% | Hooks, utils, components |
| Integration | Vitest + Supabase local | 25% | RLS policies, triggers, Edge Functions |
| E2E | Playwright | 15% | Критические user flows |

### 9.2 Top 5 тестов для MVP (обязательно перед запуском)

1. **RSVP → notification delivered** — полный цикл: join → outbox → push
2. **max_players enforced under concurrent joins** — k6, 10 VU, verify count ≤ max
3. **Outbox retry on transient failure** — mock push failure, verify 3 retries + dead letter
4. **Event cancelled → all RSVPs notified** — status change propagation
5. **iOS foreground notification received** — PWA push on real device

### 9.3 Acceptance Criteria для запуска MVP

| Область | Критерий |
|---------|----------|
| Auth | Google OAuth работает в Chrome/Firefox/Safari mobile |
| Profile | Сохранение < 2с, все поля валидированы |
| Events | Создание big + quick event < 3 тапов |
| RSVP | Счётчик обновляется у другого юзера < 2с (Realtime) |
| Notifications | 0 дубликатов в smoke test 100 юзеров |
| Expiry | Quick meetup + LFG auto-expire подтверждено в staging |
| Security | 0 RLS bypass в аудите |
| Performance | p95 лента < 300ms при 200 concurrent users |
| PWA | Push работает на Android Chrome |
| i18n | 0 missing keys в EN и RU (CI lint) |

### 9.4 Ключевые edge cases

| Feature | Edge Case |
|---------|-----------|
| RSVP | Параллельный RSVP при max_players → only going_count ≤ max |
| RSVP | Optimistic UI rollback при "event full" |
| LFG | Signal set at 23:59 → expires at 23:59 next day |
| Notifications | User subscribed to organizer + venue + format → ровно 1 notification |
| Clone event | Cloned event has clean RSVP, new ID, cloned_from reference |
| i18n | Russian strings 30% longer → no UI overflow |
| PWA | Push denied → graceful fallback to in-app only |

---

## 10. Ежедневный отчёт администратора

### Содержание

```json
{
  "date": "2026-03-04",
  "new_users": 3,
  "events_created": { "big": 1, "quick": 4 },
  "rsvps_today": { "going": 18, "maybe": 5, "not_going": 2 },
  "cancellations": { "total": 2, "late_24h": 1 },
  "lfg_signals": 6,
  "active_lfg_now": 2,
  "low_reliability_users": [
    { "user_id": "...", "display_name": "X", "score": 0.42 }
  ],
  "events_below_minimum": [
    { "event_id": "...", "title": "...", "starts_at": "...", "rsvp_count": 3, "min": 6 }
  ]
}
```

### Доставка

- Сохранение в `admin_reports` (просмотр в админ-панели)
- Email через Resend API на `ADMIN_EMAIL`

---

## 11. Решения дебатов (Decision Record)

| # | Вопрос | Варианты | Решение | Обоснование |
|---|--------|----------|---------|-------------|
| D1 | Availability storage | JSONB vs таблица | **Таблица** | Индексируемость, partial updates, query performance |
| D2 | Event status | Boolean vs enum | **Enum** | Расширяемость (cancelled, confirmed, expired) |
| D3 | max_players | Optimistic vs pessimistic lock | **Pessimistic** (SELECT FOR UPDATE) | "Boring correctness", предсказуемость |
| D4 | Notifications | pg_net vs outbox | **Outbox** | pg_net fire-and-forget, outbox testable + retryable |
| D5 | Edge Functions | 9 vs 2 | **2** (mtgx-api + mtgx-poller) | Operational burden для solo dev |
| D6 | Recurring events | Templates+rrule vs clone | **Clone button** в MVP | Простота, нет rrule complexity |
| D7 | Onboarding availability | Grid vs chips | **Chips** (grid в profile edit) | UX onboarding < 60s |
| D8 | Trigger chain | Sync vs async rsvp_history | **Sync** (аудит integrity), min_players через outbox | Deadlock prevention |
| D9 | Supabase auto-pause | Upgrade vs keepalive | **GitHub Actions keepalive** | $0 cost |

---

## 12. Оценка стоимости (Supabase Free Tier)

| Ресурс | Лимит | Оценка использования |
|--------|-------|---------------------|
| Database | 500 MB | ~5 MB (15-20 users, 100 events) |
| Bandwidth | 5 GB | ~500 MB/month |
| Edge Function invocations | 500K/month | ~100K/month (poller + API) |
| Storage | 1 GB | ~50 MB (venue photos) |
| Realtime connections | 200 concurrent | ~5-10 concurrent |

**Вывод:** Free tier достаточен для пилота. Upgrade до Pro ($25/mo) при >100 users.

---

*Документ создан при помощи Expert Panel (6 экспертов, 4 раунда дебатов). Готов к реализации.*
