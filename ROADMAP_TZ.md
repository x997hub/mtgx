# MTGX — Подробные технические задания (ТЗ)

> Результат Expert Panel с 3 раундами дебатов (6 экспертов: PM, Tech Lead, Frontend, Backend, DevOps, QA)
> Дата: 2026-03-06

---

## Корневая проблема (консенсус панели)

**Система не имеет принудительных инвариантов ни на одном уровне:**
- **БД:** нет триггера на capacity — overbooking возможен
- **Edge Function:** `rsvp_with_lock` может быть не задеплоен; имеет 3 бага даже если задеплоен
- **Frontend:** `useRSVP` делает прямой upsert, минуя Edge Function полностью
- **Тесты:** 238 тестов не запускаются в CI; нет тестов конкурентности
- **Push:** реализован как `console.log` — заглушка

**Приоритет:** Verify → Fix → Build. Ничего нового не строить пока фундамент не починен.

---

## Phase 0: Экстренные исправления (до любых новых фич)

### 0.1 — Проверить состояние продакшна

**Цель:** Определить масштаб повреждений от RSVP race condition.

**Действия:**
```sql
-- Запустить в Supabase Studio на проде:
-- 1. Overbooking check
SELECT e.id, e.title, e.max_players, COUNT(r.*) as rsvp_count
FROM events e JOIN rsvps r ON r.event_id = e.id
WHERE r.status = 'going'
GROUP BY e.id HAVING COUNT(r.*) > e.max_players;

-- 2. Проверить существование RPC
SELECT proname FROM pg_proc WHERE proname = 'rsvp_with_lock';

-- 3. Проверить phantom notifications
SELECT COUNT(*) FROM notification_outbox WHERE status = 'dead';
```

**Критерий выполнения:** Результаты задокументированы.

---

### 0.2 — Починить RSVP bypass

**Проблема:** `useRSVP.ts` вызывает `supabase.from('rsvps').upsert()` напрямую, минуя Edge Function `rsvp_with_lock`.

**Решение (3 уровня защиты):**

**Уровень 1 — БД триггер (последняя линия обороны):**
```sql
CREATE OR REPLACE FUNCTION check_capacity_before_rsvp()
RETURNS TRIGGER AS $$
DECLARE
  v_max INT;
  v_current INT;
BEGIN
  IF NEW.status != 'going' THEN RETURN NEW; END IF;

  SELECT max_players INTO v_max FROM events WHERE id = NEW.event_id;
  SELECT COUNT(*) INTO v_current FROM rsvps
    WHERE event_id = NEW.event_id AND status = 'going' AND user_id != NEW.user_id;

  IF v_current >= v_max THEN
    RAISE EXCEPTION 'capacity_exceeded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_rsvp_capacity
BEFORE INSERT OR UPDATE ON rsvps
FOR EACH ROW EXECUTE FUNCTION check_capacity_before_rsvp();
```

**Уровень 2 — Исправить `rsvp_with_lock` RPC:**
```sql
-- Правильный порядок: Lock → Check → Insert → Outbox (ПОСЛЕДНИМ)
CREATE OR REPLACE FUNCTION rsvp_with_lock(p_event_id UUID, p_user_id UUID, p_status TEXT)
RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_current INT;
  v_result RECORD;
BEGIN
  -- 1. Lock event row exclusively
  SELECT * INTO v_event FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found'; END IF;

  -- 2. Count current going RSVPs
  SELECT COUNT(*) INTO v_current FROM rsvps
    WHERE event_id = p_event_id AND status = 'going' AND user_id != p_user_id;

  -- 3. Check capacity
  IF p_status = 'going' AND v_current >= v_event.max_players THEN
    RAISE EXCEPTION 'event_full';
  END IF;

  -- 4. Upsert RSVP
  INSERT INTO rsvps (event_id, user_id, status)
  VALUES (p_event_id, p_user_id, p_status)
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status
  RETURNING * INTO v_result;

  -- 5. Outbox LAST (after all invariants satisfied)
  INSERT INTO notification_outbox (type, payload, status)
  VALUES ('rsvp_update', jsonb_build_object(
    'event_id', p_event_id, 'user_id', p_user_id, 'status', p_status
  ), 'pending');

  RETURN jsonb_build_object('success', true, 'rsvp', row_to_json(v_result));
END;
$$ LANGUAGE plpgsql;
```

**Уровень 3 — Frontend вызывает Edge Function:**
```typescript
// src/hooks/useRSVP.ts — заменить прямой upsert на fetch
const { data, error } = await fetch(`${SUPABASE_URL}/functions/v1/mtgx-api`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'rsvp', event_id: eventId, status })
});
```

**+ ESLint правило:** запретить `supabase.from('rsvps').upsert/insert/update` вне `rsvp.service.ts`.

**Файлы:** миграция SQL, `src/hooks/useRSVP.ts`, `supabase/functions/mtgx-api/index.ts`, `.eslintrc`
**Effort:** M
**Критерий:** Concurrent RSVP тест проходит 10/10 раз.

---

### 0.3 — Реализовать Web Push (убрать заглушку)

**Проблема:** `mtgx-poller/index.ts` строка ~473: `console.log('[WebPush] Would send push...')` — push не отправляются.

**Решение:** Заменить stub на `web-push` через `https://esm.sh/web-push`:
```typescript
import webpush from 'https://esm.sh/web-push@3.6.7';

webpush.setVapidDetails(
  'mailto:admin@mtgx.app',
  Deno.env.get('VITE_VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

async function sendWebPush(subscription: PushSubscription, payload: string) {
  try {
    await webpush.sendNotification(subscription, payload);
  } catch (err) {
    if (err.statusCode === 410) {
      // Удалить мёртвую подписку
      await adminClient.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
    }
  }
}
```

**Файлы:** `supabase/functions/mtgx-poller/index.ts`
**Effort:** S
**Критерий:** Push-уведомление реально приходит на тестовое устройство.

---

### 0.4 — CI запускает тесты

**Проблема:** 238 тестов существуют, но CI их не запускает.

**Решение:** Добавить в `.github/workflows/ci.yml`:
```yaml
- name: Run tests
  run: npm run test

- name: Type check
  run: npm run typecheck
```

**Файлы:** `.github/workflows/ci.yml`
**Effort:** S
**Критерий:** PR не мержится без зелёных тестов.

---

## Milestone 1: Надёжное ядро (2-3 недели)

### #1 — Фикс RSVP race condition
> Входит в Phase 0.2 выше.

---

### #2 — Новые статусы RSVP

**Описание:** Добавить `waitlisted` и `pending_confirmation` в enum `rsvp_status`.

**БД:**
```sql
ALTER TYPE rsvp_status ADD VALUE 'waitlisted';
ALTER TYPE rsvp_status ADD VALUE 'pending_confirmation';
-- ВАЖНО: отдельная миграция, ALTER TYPE ADD VALUE нельзя откатить в транзакции
```

**Колонки:**
- `rsvps.queue_position SMALLINT` — порядок в очереди waitlist

**RLS:** без изменений (политики привязаны к user_id, не к status)

**Frontend:**
- Расширить `RSVPButton` и `RSVPDialog` новыми состояниями (иконки, цвета)
- `WaitlistBadge` — компонент отображения позиции в очереди

**i18n:** ~10 новых ключей (waitlisted, pending_confirmation, queue_position, etc.)

**Зависимости:** #1 (RSVP fix)
**Effort:** M

---

### #4 — Обработка ошибок

**Описание:** Показывать понятные сообщения при сбоях сети, полном ивенте и т.д.

**Frontend:**
- Централизованный error boundary: `src/components/shared/ErrorBoundary.tsx`
- Error mapping таблица: API error code → i18n ключ → toast/dialog
- `offlineStore` (Zustand) — online/offline флаг, pending mutations queue
- React Query `onError` глобальный handler в `queryClient.ts`

**Error codes от Edge Function:**
```typescript
const ERROR_MAP: Record<string, string> = {
  'event_full': 'errors.event_full',
  'event_not_found': 'errors.event_not_found',
  'already_registered': 'errors.already_registered',
  'not_authenticated': 'errors.not_authenticated',
  'network_error': 'errors.network_error',
  'rate_limited': 'errors.rate_limited',
};
```

**i18n:** ~15 ключей для ошибок (en/ru/he)

**Файлы:** `src/lib/queryClient.ts`, `src/components/shared/ErrorBoundary.tsx`, `src/store/offlineStore.ts`, locales
**Effort:** M

---

### #13 — Очередь (Waitlist)

**Описание:** При полном ивенте — встать в очередь. Место освободилось → push первому.

**БД:**
- Использует `rsvp_status = 'waitlisted'` из #2
- `rsvps.queue_position SMALLINT` — автоинкремент при добавлении в waitlist

**RPC:**
```sql
CREATE OR REPLACE FUNCTION promote_from_waitlist(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
  v_next RECORD;
BEGIN
  -- Lock event
  PERFORM id FROM events WHERE id = p_event_id FOR UPDATE;

  -- Find capacity
  IF (SELECT COUNT(*) FROM rsvps WHERE event_id = p_event_id AND status = 'going')
     >= (SELECT max_players FROM events WHERE id = p_event_id) THEN
    RETURN; -- Still full
  END IF;

  -- Promote first in queue
  SELECT * INTO v_next FROM rsvps
    WHERE event_id = p_event_id AND status = 'waitlisted'
    ORDER BY queue_position ASC LIMIT 1 FOR UPDATE;

  IF FOUND THEN
    UPDATE rsvps SET status = 'going', queue_position = NULL WHERE id = v_next.id;
    INSERT INTO notification_outbox (type, payload, status) VALUES
      ('waitlist_promoted', jsonb_build_object('event_id', p_event_id, 'user_id', v_next.user_id), 'pending');
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**Edge Function:** `rsvp_with_lock` → при `event_full` автоматически ставить в waitlist вместо ошибки

**Frontend:**
- `useWaitlist(eventId)` hook — позиция, Realtime подписка на promotion
- `WaitlistBadge` — "Вы #3 в очереди"
- RSVPButton показывает "Встать в очередь" при полном ивенте

**Poller:** `promote_from_waitlist()` вызывается при каждом cancel/not_going RSVP

**Зависимости:** #1, #2
**Effort:** L

---

### #33 — Иврит + RTL

**Описание:** Полная локализация на иврит с поддержкой RTL.

**Подход (Feature-flag, инкрементально):**
1. Добавить `dir` атрибут на `<html>` через `useRTLDirection()` hook
2. Перейти на CSS logical properties: `ms-*`/`me-*` вместо `ml-*`/`mr-*`
3. Добавить `he/` namespace в i18n (4 файла: common, events, profile, venue)
4. Шрифт: Noto Sans Hebrew через Google Fonts

**Объём работ:**
- ~200+ мест с `ml-*/mr-*` → `ms-*/me-*`
- ~15 мест с `text-left/text-right` → `text-start/text-end`
- ~10 мест с `left-*/right-*` → `start-*/end-*`
- Иконки со стрелками: `rotate-180` в RTL
- Все 4 i18n namespace на иврит (~300 ключей)

**Tailwind v4:** Добавить `@custom-variant rtl (&:where([dir=rtl] *));` в CSS config

**Новые файлы:** `src/locales/he/common.json`, `events.json`, `profile.json`, `venue.json`
**Модификации:** Все компоненты с directional margins/paddings
**Effort:** L (2-3 недели с тестированием)
**Зависимости:** нет, но лучше делать до добавления новых компонентов

---

### #3 — Автогенерация типов

**Описание:** Заменить ручной `database.types.ts` на автоматический из Supabase.

**Решение:**
```bash
# package.json
"scripts": {
  "gen:types": "supabase gen types typescript --local > src/types/database.types.ts"
}

# CI: drift detection
supabase gen types typescript --db-url $SUPABASE_PROD_DB_URL > /tmp/types.ts
diff src/types/database.types.ts /tmp/types.ts || (echo "Types drift!" && exit 1)
```

**Файлы:** `package.json`, `.github/workflows/ci.yml`, `src/types/database.types.ts`
**Effort:** S
**Критерий:** `npm run gen:types` работает, CI ловит drift

---

## Milestone 2: Еженедельный ритм (3-4 недели)

### #12 — Подтверждение участия

**Описание:** Push за 24h и 3h до начала: "ты точно идёшь?" с кнопкой подтверждения.

**БД:**
```sql
ALTER TABLE events ADD COLUMN confirmation_sent_24h BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN confirmation_sent_3h BOOLEAN DEFAULT false;
```

**Poller:** Новая задача `sendConfirmationReminders()`:
```typescript
// Найти события в окне 24±1h и 3±0.5h от starts_at
// Для каждого: создать outbox type='attendance_confirmation'
// Обновить флаг confirmation_sent_24h/3h
```

**Edge Function:** `POST /confirm-attendance` — отмечает подтверждение, обновляет reliability_score

**Frontend:**
- Push notification с deep link на страницу события
- Кнопка "Подтверждаю" на EventDetailPage (для confirmed events)

**i18n:** ~5 ключей
**Effort:** M
**Зависимости:** Phase 0.3 (Web Push)

---

### #15 — Сообщения участникам

**Описание:** Организатор может писать записавшимся игрокам. Broadcast-модель (не мессенджер).

**БД:**
```sql
CREATE TABLE public.organizer_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL CHECK (length(body) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: организатор пишет, участники читают
CREATE POLICY "organizer_can_write" ON organizer_messages
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "participants_can_read" ON organizer_messages
  FOR SELECT USING (
    auth.uid() = organizer_id OR
    EXISTS (SELECT 1 FROM rsvps WHERE event_id = organizer_messages.event_id
            AND user_id = auth.uid() AND status IN ('going', 'maybe'))
  );
```

**Edge Function:** `POST /event-message` — создаёт сообщение + outbox записи для каждого участника

**Frontend:**
- `MessageComposer` компонент на EventDetailPage (только для организатора)
- Список сообщений организатора на EventDetailPage (для всех участников)
- Push уведомление участникам

**i18n:** ~8 ключей
**Effort:** M
**Зависимости:** Phase 0.3 (Web Push)

---

### #17 — Добор игроков

**Описание:** За 48h до ивента, 1-2 места — push подходящим игрокам.

**Poller:** Новая задача `recruitPlayers()`:
```typescript
// 1. Найти события: starts_at в окне 24-72h, capacity_remaining <= 2
// 2. Для каждого: вызвать count_available_players RPC
// 3. Создать outbox type='player_recruitment' для matching игроков
// 4. Лимит: 1 recruitment push на игрока в день
```

**Frontend:** Push с deep link на событие. Без дополнительного UI.

**Effort:** M
**Зависимости:** Phase 0.3 (Web Push), auto_match_preferences (уже есть)

---

### #18 — Репутация организатора

**Описание:** Статистика: сколько провёл, % отмен, средняя посещаемость.

**БД:**
```sql
CREATE OR REPLACE VIEW organizer_stats AS
SELECT
  e.organizer_id,
  COUNT(*) AS events_total,
  COUNT(*) FILTER (WHERE e.status = 'cancelled') AS events_cancelled,
  ROUND(COUNT(*) FILTER (WHERE e.status = 'cancelled')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) AS cancel_rate,
  ROUND(AVG(
    (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'going')
  ), 1) AS avg_attendance
FROM events e
GROUP BY e.organizer_id;
```

**Frontend:**
- `OrganizerStatsCard` на ProfilePage (для организаторов/club_owners)
- Показывать: "42 события • 2.4% отмен • ~8 игроков в среднем"

**i18n:** ~6 ключей
**Effort:** S-M

---

### #36 — Система обратной связи и баг-репортов

**Описание:** Кнопка "Сообщить о проблеме" с любого экрана.

**БД:**
```sql
CREATE TABLE public.feedback_reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('bug', 'suggestion', 'question')),
  body TEXT NOT NULL CHECK (length(body) <= 2000),
  screenshot_url TEXT,
  page_url TEXT,
  user_agent TEXT,
  app_version TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: свои можно читать, любой authenticated может создать
CREATE POLICY "user_read_own" ON feedback_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert" ON feedback_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Admin: через service role в Edge Function
```

**Frontend:**
- `FeedbackModal` — глобальная кнопка в AppShell (правый нижний угол)
- Форма: тип (3 кнопки), описание (textarea), скриншот (file upload в Supabase Storage)
- Автосбор: `navigator.userAgent`, `window.location.href`, язык, версия из `package.json`
- Admin вкладка: таблица с фильтрами по type/status, поле admin_notes

**i18n:** ~15 ключей
**Effort:** M

---

## Milestone 3: Живое сообщество (4-5 недель)

### #5 — «Иду сегодня»

**Описание:** Кнопка "я свободен прямо сейчас", выбор длительности (1-5h), при 3+ людях предложить создать встречу.

**БД:**
```sql
ALTER TABLE looking_for_game ADD COLUMN duration_hours SMALLINT DEFAULT 4;
ALTER TABLE looking_for_game ADD COLUMN is_instant BOOLEAN DEFAULT false;
```

**Логика триггера (poller или realtime):**
```
-- Когда в городе ≥3 instant LFG с пересекающимися форматами:
-- Создать outbox type='instant_meetup_suggestion' для всех троих
```

**Frontend:**
- FAB (уже есть `shared/FAB.tsx`) → Bottom Sheet с:
  - Duration picker (1/2/3/4/5h кнопки)
  - Format multi-select
  - "Активировать" кнопка
- Live counter на FAB badge: "3 игрока ищут"
- При 3+ — Toast "3 игрока свободны! Создать встречу?"

**Hook:** `useGoingToday()` — расширение `useLFG` для instant режима

**i18n:** ~10 ключей
**Effort:** M

---

### #9 — Карточки события для шеринга

**Описание:** OG meta tags для красивого превью в WhatsApp/Telegram. Post-event summary image.

**Архитектура:**
1. **Vercel Serverless Function** `/api/og/[eventId].png` — генерирует PNG через `@vercel/og` (satori)
2. **Prerender proxy** `/api/event/[eventId]` — для ботов (WhatsApp, Telegram) отдаёт HTML с OG meta, для браузеров — redirect на SPA

**OG Meta Tags:**
```html
<meta property="og:title" content="Pauper Tournament — Tel Aviv" />
<meta property="og:description" content="Mar 15 at 19:00 • 12/16 spots • Rotemz Club" />
<meta property="og:image" content="https://mtgx.app/api/og/EVENT_ID.png" />
<meta property="og:url" content="https://mtgx.app/events/EVENT_ID" />
```

**Post-event image:** Генерируется через poller после завершения события. Сохраняется в Supabase Storage.

**Файлы:** `api/og/[eventId].ts` (Vercel), `api/event/[eventId].ts` (Vercel)
**Frontend:** `ShareButton` компонент с Web Share API + fallback на копирование

**Effort:** M
**Зависимости:** Vercel deployment

---

### #16 — Индикатор заполненности ивента

**Описание:** Круговая диаграмма заполненности (занято/максимум).

**Frontend:**
```typescript
// src/components/shared/CircularProgress.tsx
interface Props {
  value: number; // current
  max: number;
  size?: number; // px
}
// SVG circle с stroke-dasharray/dashoffset
```

Вставить в: `EventCard`, `EventDetailPage`

**Effort:** S

---

### #19 — Повторяющиеся события

**Описание:** "Каждый четверг Pauper" — система автогенерирует.

**БД:**
```sql
CREATE TABLE public.event_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES profiles(id),
  venue_id UUID REFERENCES venues(id),
  recurrence_rule TEXT NOT NULL, -- iCal RRULE: "FREQ=WEEKLY;BYDAY=TH"
  template_data JSONB NOT NULL, -- все поля события кроме starts_at
  last_generated_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE events ADD COLUMN template_id UUID REFERENCES event_templates(id);
```

**Poller:** `generateRecurringEvents()` — rolling window 2 недели вперёд:
```typescript
// Для каждого активного template:
// 1. Парсить RRULE (библиотека rrule.js)
// 2. Генерировать даты на 14 дней вперёд
// 3. Пропустить уже сгенерированные (проверка events.template_id + starts_at)
// 4. INSERT новые события с template_id ссылкой
```

**Frontend:**
- `RecurrencePicker` в BigEventForm — ToggleGroup для дней + Select для частоты
- Отображение "Повторяющееся" бейджа на EventCard

**i18n:** ~8 ключей
**Effort:** L

---

### #10 — Теги настроения

**Описание:** Казуальная / соревновательная / тест колоды / обучение.

**БД:**
```sql
CREATE TABLE public.mood_tags (
  id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  label_en TEXT NOT NULL,
  label_ru TEXT NOT NULL,
  label_he TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);
-- Seed: casual, competitive, deck_test, training

ALTER TABLE events ADD COLUMN mood_tags TEXT[] DEFAULT '{}';
```

**Admin:** CRUD для mood_tags в AdminPage

**Frontend:**
- `MoodTagSelector` чипы в BigEventForm
- Фильтр по тегам в EventFeedPage

**Effort:** S

---

### #11 — Политика прокси

**Описание:** Переключатель: без прокси / частично / полностью разрешены.

**БД:**
```sql
CREATE TYPE proxy_policy AS ENUM ('none', 'partial', 'full');
ALTER TABLE events ADD COLUMN proxy_policy proxy_policy DEFAULT 'none';
```

**Frontend:** Select в BigEventForm + бейдж на EventCard

**Effort:** S

---

### #24 — Commander Brackets

**Описание:** Указать силу колоды 1-5 при записи на Commander.

**БД:**
```sql
ALTER TABLE rsvps ADD COLUMN power_level SMALLINT
  CHECK (power_level IS NULL OR power_level BETWEEN 1 AND 5);
```

**Frontend:**
- `PowerLevelPicker` (5 кнопок) в RSVP flow когда format=commander
- Отображение power level рядом с именем в списке участников

**Effort:** S

---

### #14 — Автосохранение черновика

**Описание:** Форма события сохраняется при потере WiFi.

**Решение:** `useFormAutosave(key, formState)` hook:
```typescript
// Debounced save в localStorage каждые 2 секунды
// При mount: восстановить из localStorage если есть
// При успешном submit: очистить localStorage
// Key: `event-draft-${userId}-${type}`
```

**Файлы:** `src/hooks/useFormAutosave.ts`, интеграция в `BigEventForm`, `QuickMeetupForm`
**Effort:** S

---

## Milestone 4: Прогрессия и вовлечённость (6-8 недель)

### #6 — Очки опыта (XP)

**Описание:** Начисление за посещение, создание событий, приглашение друзей. Уровни. Admin таблица.

**БД:**
```sql
-- Append-only ledger (НИКОГДА не UPDATE)
CREATE TABLE public.xp_ledger (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  delta INT NOT NULL,
  reason xp_reason NOT NULL,
  reference_id TEXT, -- event_id, referral_id, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE xp_reason AS ENUM (
  'checkin', 'event_created', 'referral_sent', 'referral_joined',
  'achievement', 'league_win', 'admin_grant', 'admin_deduct'
);

-- Config table (admin-editable)
CREATE TABLE public.xp_config (
  reason xp_reason PRIMARY KEY,
  points INT NOT NULL DEFAULT 10,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Денормализованный кэш на profiles
ALTER TABLE profiles ADD COLUMN xp_total INT NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN xp_level SMALLINT NOT NULL DEFAULT 1;

-- Trigger: обновлять xp_total при INSERT в xp_ledger
CREATE OR REPLACE FUNCTION update_xp_total() RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET
    xp_total = xp_total + NEW.delta,
    xp_level = GREATEST(1, FLOOR(SQRT((xp_total + NEW.delta) / 100.0)) + 1)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_xp_ledger_after_insert
AFTER INSERT ON xp_ledger
FOR EACH ROW EXECUTE FUNCTION update_xp_total();
```

**Admin UI:** Таблица `xp_config` — редактирование points per reason

**Frontend:**
- `XPBar` — SVG progress bar на ProfilePage
- `LevelBadge` — бейдж уровня на PlayerCard
- Admin вкладка: таблица xp_config с inline-editing

**i18n:** ~10 ключей
**Effort:** L

---

### #7 — Достижения

**Описание:** Бейджи на профиле. Admin CRUD.

**БД:**
```sql
CREATE TABLE public.achievements (
  id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_he TEXT,
  description_en TEXT,
  description_ru TEXT,
  icon TEXT NOT NULL DEFAULT '🏆', -- emoji or URL
  condition_type TEXT NOT NULL, -- 'checkins_count', 'events_created', 'formats_played', etc.
  condition_value INT NOT NULL DEFAULT 1, -- threshold
  xp_reward INT NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.user_achievements (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id SMALLINT REFERENCES achievements(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);
```

**Проверка условий:** Cron в poller (ежечасно) или trigger на соответствующих таблицах.

**Frontend:**
- `AchievementBadge` — иконка + tooltip (locked/unlocked)
- `AchievementGrid` на ProfilePage — сетка всех достижений
- Admin вкладка: CRUD для achievements

**i18n:** ~8 ключей + названия ачивок
**Effort:** L
**Зависимости:** #6 (XP для reward)

---

### #8 — QR Check-in

**Описание:** Организатор сканирует QR клуба (привязка к venue). Игроки сканируют QR организатора (подтверждение явки). Без check-in = no XP.

**БД:**
```sql
CREATE TABLE public.checkins (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  method checkin_method NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE TYPE checkin_method AS ENUM ('qr_organizer', 'qr_venue', 'manual');

ALTER TABLE venues ADD COLUMN checkin_token UUID DEFAULT gen_random_uuid();
ALTER TABLE events ADD COLUMN checkin_required BOOLEAN DEFAULT false;
```

**Два QR-потока:**

1. **Venue QR** (статический): закодирован `venues.checkin_token`. Организатор сканирует → `POST /checkin { venue_token, event_id }` → привязка к venue.

2. **Organizer QR** (динамический): организатор показывает QR на своём экране, закодирован short-lived JWT с `event_id`. Игрок сканирует → `POST /checkin { event_token }` → запись checkin.

**Edge Function:** `POST /checkin` — верифицирует токен, создаёт checkin, начисляет XP через xp_ledger.

**Frontend:**
- `QRDisplay` — qrcode.react обёртка (организатор показывает на экране)
- `QRScanner` — getUserMedia + jsQR (игрок сканирует)
- Fallback: ввод кода вручную (6-digit PIN)
- CheckinPage: `/events/:id/checkin`

**Effort:** L
**Зависимости:** #6 (XP)

---

### #25 — Карта клубов

**Описание:** Поиск по радиусу "что рядом сегодня вечером".

**БД:**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE venues ADD COLUMN location GEOGRAPHY(POINT);
CREATE INDEX idx_venues_location ON venues USING GIST(location);

-- RPC: поиск по радиусу
CREATE OR REPLACE FUNCTION venues_within_radius(
  p_lat FLOAT, p_lng FLOAT, p_radius_km INT DEFAULT 10
) RETURNS SETOF venues AS $$
  SELECT * FROM venues
  WHERE ST_DWithin(location, ST_Point(p_lng, p_lat)::geography, p_radius_km * 1000)
  ORDER BY ST_Distance(location, ST_Point(p_lng, p_lat)::geography);
$$ LANGUAGE sql STABLE;
```

**Frontend:**
- `MapWithMarkers` — Leaflet + OpenStreetMap (бесплатно, без API key)
- Radius slider (5/10/25/50 km)
- Маркеры с popup (название, сегодняшние события)
- Geolocation API для определения позиции пользователя

**Effort:** L

---

## Milestone 5: Рост и масштабирование (квартал)

### #20 — Календарь клуба
**БД:** View combining events + venue_slots по venue_id + date range
**Frontend:** `WeeklyCalendarGrid` — 7 колонок, события как блоки. Mobile: horizontal scroll + snap.
**Effort:** M

### #21 — Резервация слотов
**БД:** `venue_slots (id, venue_id, starts_at, ends_at, blocked_by, note)` + overlap check constraint
**Frontend:** `TimeBlockSelector` grid
**Effort:** M

### #22 — Аналитика клуба
**БД:** Materialized views для aggregated metrics (players/month, format distribution, retention)
**Frontend:** `AnalyticsDashboard` с recharts (BarChart, LineChart, PieChart)
**Effort:** L

### #23 — Готовые сообщения
**БД:** `message_templates (id, organizer_id, title, body)`. Seed: "Начинаем позже", "Нужен ещё 1 игрок", "Место изменилось"
**Frontend:** `TemplatePickerDialog` в MessageComposer
**Effort:** S

### #26 — Рейтинг клубов
**БД:** Computed view (events count, avg attendance, rating) + cached в venues.rating
**Frontend:** `LeaderboardTable` с рангами
**Effort:** M

### #27 — Профиль стиля игры
**БД:** `play_style_profiles (user_id PK, competitiveness 1-5, speed 1-5, sociability 1-5)`
**Frontend:** `PlayStyleQuestionnaire` + radar chart на профиле
**Effort:** S

### #28 — Утилиты для игры
**Frontend only:** Новая страница `/tools` с 3 standalone компонентами:
- Life counter (multi-player, +1/-1/reset)
- First player randomizer (spin wheel animation)
- Turn timer (configurable, sound alert)
**Effort:** M

### #29 — Реферальная система
**БД:** `profiles.referral_code TEXT UNIQUE`, `referrals (referrer_id, referred_id, xp_granted_at)`
**Frontend:** ShareButton с реферальной ссылкой `/r/:code`, трекер приглашений
**Edge Function:** При регистрации проверить referral_code → XP обоим
**Effort:** M
**Зависимости:** #6 (XP)

### #35 — Carpooling
**БД:** `carpool_offers (id, event_id, driver_id, seats_available, pickup_city, contact_note)`
**Frontend:** `CarpoolingCard` на EventDetailPage + кнопка "Предложить подвозку"
**Effort:** M

---

## Future (после product-market fit)

### #30 — Подписка для клубов (Pro)
**Инфраструктура:** Stripe, webhook handler, `venue_subscriptions` таблица, `FeatureGate` HOC
**Effort:** XL

### #31 — Лиги и сезоны
**БД:** `leagues`, `league_rounds`, `league_standings` + результаты матчей
**Frontend:** `StandingsTable`, `BracketView` (SVG)
**Effort:** L

### #32 — WhatsApp/Telegram бот
**Архитектура:** Отдельная Edge Function `/telegram-webhook`. Telegram first (бесплатно). WhatsApp — позже (Meta Business API, $$$, 4+ недели верификация).
**Effort:** L (Telegram), XL (WhatsApp)

### #34 — Нативное приложение
**Варианты:** Capacitor (обёртка над PWA), React Native (переписывание)
**Effort:** XL

---

## Матрица зависимостей

```
Phase 0 (RSVP fix + Push + CI)
  ├── #2 (RSVP statuses) + #13 (Waitlist) ← зависят от корректного RSVP
  ├── #12 (Confirmation push) ← зависит от реального Push
  ├── #15 (Messages) ← зависит от Push
  ├── #17 (Recruitment) ← зависит от Push + auto_match
  │
  ├── #6 (XP) ← независим, но нужен для:
  │   ├── #7 (Achievements) ← нужен XP
  │   ├── #8 (QR Check-in) ← нужен XP; делает XP честным
  │   └── #29 (Referrals) ← нужен XP
  │
  ├── #19 (Recurring events) ← нужен стабильный poller
  └── #33 (Hebrew RTL) ← независим, но лучше до новых компонентов
```

## Матрица усилий

| Effort | Фичи |
|--------|-------|
| **S** | #3, #10, #11, #14, #16, #23, #24, #27 |
| **M** | #2, #4, #5, #9, #12, #15, #17, #18, #20, #21, #26, #28, #29, #35, #36 |
| **L** | #6, #7, #8, #13, #19, #22, #25, #31, #33 |
| **XL** | #30, #32 (WhatsApp), #34 |

---

## Measurable Outcomes

| Recommendation | Metric | Baseline | Target | Verify |
|---|---|---|---|---|
| Fix RSVP bypass | useRSVP calls Edge Function | 0% | 100% | Phase 0 |
| DB capacity trigger | Overbooking count | Unknown | 0 | Phase 0 |
| Web Push delivery | Push delivery rate | 0% (stub) | >95% | Phase 0 |
| CI test gate | Tests run on every PR | No | Yes | Phase 0 |
| Hebrew RTL | Hebrew-speaking users | 0 | >50% of Israeli users | MS1 |
| Confirmation push | No-show rate | Unknown | -30% | MS2 |
| Event sharing | Events shared via WhatsApp/month | 0 | >50 | MS3 |
| XP engagement | Users checking XP/week | 0 | >30% MAU | MS4 |
