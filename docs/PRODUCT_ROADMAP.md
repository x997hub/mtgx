# MTGx — Product Roadmap v2

**Фокус:** максимум полезного функционала. Каждая фича отвечает на вопрос "почему пользователь вернётся завтра?"

---

## Принципы

**Для игроков — бесплатно, просто, интересно.** Мотивация через XP и ачивки, не через наказания.

**Монетизация — только через магазины.** Freemium B2B.

**Симбиоз с WhatsApp.** Плагин, не замена. Каждая фича усиливает WhatsApp-шеринг.

**Каждая фича = причина вернуться.** Если фича не отвечает на "почему пользователь откроет приложение завтра?" — она не нужна.

---

## Техдолг (сделать первым, 2-3 дня)

Без этого новые фичи будут на гнилом фундаменте.

### rsvp_with_lock
Текущий код имеет race condition (TOCTOU). `FOR UPDATE SKIP LOCKED` в SECURITY DEFINER RPC. Без этого waitlist, двухфазная запись и любая логика поверх RSVP — ненадёжны.

```sql
CREATE OR REPLACE FUNCTION rsvp_with_lock(
  p_event_id UUID, p_user_id UUID, p_status rsvp_status
) RETURNS rsvps LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE v_event events%ROWTYPE; v_count INT; v_rsvp rsvps%ROWTYPE;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id FOR UPDATE SKIP LOCKED;
  IF v_event IS NULL THEN RAISE EXCEPTION 'event_locked'; END IF;
  IF v_event.status NOT IN ('active','confirmed') THEN
    RAISE EXCEPTION 'event_not_active'; END IF;
  IF p_status = 'going' AND v_event.max_players IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM rsvps
      WHERE event_id = p_event_id AND status = 'going';
    IF v_count >= v_event.max_players THEN
      RAISE EXCEPTION 'event_full'; END IF;
  END IF;
  INSERT INTO rsvps(event_id, user_id, status)
    VALUES (p_event_id, p_user_id, p_status)
    ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status
    RETURNING * INTO v_rsvp;
  RETURN v_rsvp;
END;$$;
```

### Enum расширение
Добавить `pending_confirm`, `waitlist` в `rsvp_status` сразу. ALTER TYPE в PostgreSQL необратим — дешевле сделать сейчас, чем пересоздавать таблицу потом.

```sql
ALTER TYPE rsvp_status ADD VALUE IF NOT EXISTS 'pending_confirm';
ALTER TYPE rsvp_status ADD VALUE IF NOT EXISTS 'waitlist';
```

### supabase gen types
Заменить ручные типы на автогенерацию: `"types:gen": "supabase gen types typescript --linked > src/types/database.types.ts"`. Запускать после каждой миграции.

### Error states
Пройтись по всем экранам: что видит пользователь при ошибке сети, при "ивент полон", при конфликте данных. В шумном зале непонятная ошибка = удалённое приложение. Toast с понятным текстом + retry кнопка где уместно.

---

## Волна 1 — Причины возвращаться (1-2 недели)

### «Иду сегодня» — эфемерный сигнал

Большая кнопка на главном экране. Один тап — ты видим всем в городе. TTL 2 часа (flash-механика — MTG-флейвор). Когда 3+ человек нажали — подсказка "Создать встречу?". Это единственная фича которая даёт причину открыть приложение каждый день в 17:00. Заменяет 45-минутный WhatsApp-тред "кто сегодня свободен?".

```sql
CREATE TABLE lfg_signals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city       TEXT NOT NULL,
  format     mtg_format,
  message    TEXT,              -- опциональный короткий текст
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '2 hours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lfg_active ON lfg_signals(city, expires_at) WHERE expires_at > now();
ALTER TABLE lfg_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lfg_read_active" ON lfg_signals FOR SELECT USING (expires_at > now());
CREATE POLICY "lfg_insert_own" ON lfg_signals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lfg_delete_own" ON lfg_signals FOR DELETE USING (auth.uid() = user_id);
```

Push: Supabase Realtime subscription на `lfg_signals` → клиент фильтрует по city/format → toast + звук. При 3+ сигналов в городе — баннер "3 игрока свободны рядом! Создать встречу?"

### XP и уровни

Полноценная система, не заглушка. Начисление XP:

| Действие | XP | Почему |
|---|---|---|
| Записался going + QR check-in | +20 | Core loop — ходить на игры |
| Создал событие которое состоялось | +30 | Стимул организовывать |
| Пригласил нового игрока (реферал) | +50 | Виральность — самое ценное |
| Записался maybe + пришёл | +10 | Поощрение честности |
| Первый визит в новый клуб | +15 | Расширение географии |

Уровни (квадратичная кривая, формула: `level = floor(sqrt(total_xp / 100)) + 1`):

| Уровень | XP | Название |
|---|---|---|
| 1 | 0 | Squire |
| 2 | 100 | Apprentice |
| 3 | 400 | Mage |
| 4 | 900 | Archmage |
| 5 | 1600 | Planeswalker |
| 6 | 2500 | Mythic |
| 7 | 3600 | Eternal |

Визуальный бейдж уровня на профиле и в списке участников ивента. Цветная рамка аватара меняется с уровнем (серая → бронза → серебро → золото → фиолет → анимированный градиент). При level-up — card-flip анимация (0.8 сек) + toast "Вы достигли Archmage".

```sql
-- XP Ledger (immutable — никогда не UPDATE, только INSERT)
CREATE TABLE user_xp (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount       INT NOT NULL,
  reason       TEXT NOT NULL,
  ref_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  ref_meta     JSONB,
  awarded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_xp_user ON user_xp(user_id);

-- Кэш на профиле
ALTER TABLE profiles ADD COLUMN total_xp INT NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN xp_level INT NOT NULL DEFAULT 1;

-- Auto-update trigger
CREATE OR REPLACE FUNCTION fn_update_xp_cache() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_total INT; v_level INT;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total FROM user_xp WHERE user_id = NEW.user_id;
  v_level := GREATEST(1, floor(sqrt(GREATEST(v_total, 0) / 100.0))::INT + 1);
  UPDATE profiles SET total_xp = v_total, xp_level = v_level WHERE id = NEW.user_id;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_xp_cache AFTER INSERT ON user_xp
  FOR EACH ROW EXECUTE FUNCTION fn_update_xp_cache();

-- RLS: читать свои, писать только через RPC
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_read_own" ON user_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "xp_no_direct_write" ON user_xp FOR INSERT WITH CHECK (false);
```

### Достижения (ачивки)

Разблокируются автоматически. Видны на профиле. Горизонтальный скролл маленьких иконок.

| Ачивка | Условие | Иконка |
|---|---|---|
| First Tap | Первый RSVP going | Tapped land |
| Regular | 5 ивентов за месяц | Calendar |
| Organizer | Создал 3 события которые состоялись | Spell stack |
| Multi-format | Играл в 3+ форматов | Rainbow mana |
| Reliable | 10 going подряд без отмен | Shield |
| Explorer | Посетил 3 разных клуба | Compass |
| Recruiter | Привёл 3 новых игроков | Portal |
| Veteran | 50 ивентов всего | Crown |
| Founder | Один из первых 50 пользователей | Star |
| Night Owl | 5 ивентов после 20:00 | Moon |
| Weekend Warrior | 10 ивентов в выходные | Sword |

```sql
CREATE TABLE achievements (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_key    TEXT NOT NULL,
  xp_reward   INT NOT NULL DEFAULT 0,
  is_hidden   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE user_achievements (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ref_event_id   UUID REFERENCES events(id) ON DELETE SET NULL,
  UNIQUE(user_id, achievement_id)
);
CREATE INDEX idx_ua_user ON user_achievements(user_id);

-- RLS: ачивки публичны (видны на профилях), запись только через RPC
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_read_all" ON achievements FOR SELECT USING (true);
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ua_read_all" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "ua_no_direct_write" ON user_achievements FOR INSERT WITH CHECK (false);

-- Единая функция начисления XP + ачивок
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID, p_amount INT, p_reason TEXT,
  p_event_id UUID DEFAULT NULL, p_achievement TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO user_xp(user_id, amount, reason, ref_event_id)
  VALUES (p_user_id, p_amount, p_reason, p_event_id);
  IF p_achievement IS NOT NULL THEN
    INSERT INTO user_achievements(user_id, achievement_id, ref_event_id)
    VALUES (p_user_id, p_achievement, p_event_id)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    -- Bonus XP за ачивку
    INSERT INTO user_xp(user_id, amount, reason, ref_event_id)
    SELECT p_user_id, xp_reward, 'achievement_' || p_achievement, p_event_id
    FROM achievements WHERE id = p_achievement AND xp_reward > 0;
  END IF;
END;$$;
```

### QR Check-in

Организатор показывает QR на телефоне/экране. Игрок сканирует = подтверждение присутствия. Фундамент: XP, reliability, аналитика — всё завязано на реальную явку. **Без check-in'а XP за going не начисляется.**

```sql
ALTER TABLE events ADD COLUMN qr_token UUID DEFAULT gen_random_uuid();
ALTER TABLE events ADD COLUMN checkin_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE rsvps ADD COLUMN checked_in_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION checkin_by_qr(p_token UUID, p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE v_event_id UUID;
BEGIN
  SELECT id INTO v_event_id FROM events WHERE qr_token = p_token;
  IF v_event_id IS NULL THEN RAISE EXCEPTION 'invalid_qr'; END IF;
  UPDATE rsvps SET checked_in_at = now()
  WHERE event_id = v_event_id AND user_id = p_user_id AND status = 'going';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_rsvped'; END IF;
END;$$;
```

UI: Организатор — fullscreen QR (высокий контраст, работает даже при слабом WiFi — token кэшируется). Игрок — кнопка "Сканировать QR" → камера → done.

### Recap Card

После закрытия ивента — красивая шеринговая карточка: "Friday Draft at Rotemz — 8 players, Pauper." Генерация на клиенте (`dom-to-image`). Один тап → в WhatsApp. Логотип MTGx = бесплатный маркетинг. Создаёт FOMO у тех кто не пришёл.

Содержит: формат, площадка, число участников, дата, XP earned, unlocked achievements. Watermark "mtgx.app".

### Intent Tags

При создании quick meetup — выбор тега: Casual / Competitive / Deck Testing / Draft / Teaching. Pill chips на карточке (цветокодированные: casual=зелёный, competitive=красный, teaching=синий). Игрок понимает куда идёт до того как нажмёт going.

```sql
ALTER TABLE events ADD COLUMN intent_tags TEXT[] DEFAULT '{}';
CREATE INDEX idx_events_intent ON events USING GIN(intent_tags);
```

### Язык стола

Флаг на событии: RU / EN / HE / Mixed. Иконки флагов на карточке ивента. Фильтр в ленте. Для Израиля это критично — русскоязычный игрок, нашедший "русский стол", расскажет всем знакомым. Мощнейший acquisition channel для русскоязычного сегмента.

```sql
ALTER TABLE events ADD COLUMN table_language TEXT DEFAULT 'mixed';
```

### Proxy Policy

Переключатель на big event: No Proxies / Partial (N карт) / 100% Proxy Friendly. Иконка на карточке (щит = no proxies, копия = proxies OK). Убирает сотни одинаковых вопросов.

```sql
ALTER TABLE events ADD COLUMN proxy_policy TEXT DEFAULT 'allowed';
-- Values: 'none', 'partial', 'allowed'
```

### WhatsApp-оптимизированные шеринг-ссылки

Когда организатор кидает ссылку на MTGx ивент в WhatsApp — рендерится красивая карточка:
- Название + формат
- Дата и время
- Площадка
- "5/8 мест занято"
- Proxy policy + язык стола
- Intent tags

OG meta tags на EventDetailPage. Через Vercel OG Image Generation для динамических изображений.

---

## Волна 2 — Умная логистика (2-3 недели)

### Двухфазная запись

За 24-6 часов до начала — push "Подтверди участие" с одной кнопкой. Кто подтвердил — цветной аватар в списке. Кто не ответил — серый (maybe). Организатор видит реальную картину. Никаких штрафов — просто уточнение.

```sql
ALTER TABLE rsvps ADD COLUMN confirmed_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN confirmation_deadline TIMESTAMPTZ;
-- Поллер: за 24ч до event.starts_at → push с кнопкой → при тапе → UPDATE rsvps SET confirmed_at = now()
```

### Waitlist

Когда max_players достигнут — кнопка "Встать в очередь". Позиция видна: "Вы #2". При открытии места — push с 30-минутным окном "Место освободилось! Занять?". FIFO, атомарный RPC.

```sql
CREATE TABLE event_waitlist (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position  INT NOT NULL,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
CREATE INDEX idx_waitlist_event ON event_waitlist(event_id, position);

CREATE OR REPLACE FUNCTION promote_from_waitlist(p_event_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE v_next RECORD;
BEGIN
  SELECT * INTO v_next FROM event_waitlist
    WHERE event_id = p_event_id ORDER BY position LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF v_next IS NOT NULL THEN
    INSERT INTO rsvps(event_id, user_id, status) VALUES (p_event_id, v_next.user_id, 'going')
      ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'going';
    DELETE FROM event_waitlist WHERE id = v_next.id;
    -- Shift positions
    UPDATE event_waitlist SET position = position - 1 WHERE event_id = p_event_id;
    -- Push notification через outbox
    INSERT INTO notification_outbox(user_id, event_type, payload)
    VALUES (v_next.user_id, 'waitlist_promoted', jsonb_build_object('event_id', p_event_id));
  END IF;
END;$$;
```

### Авто-отмена

За 3 часа до старта если going < min_players — автоматическая отмена. Push всем: "Не набрался кворум. Перенести?" с кнопкой one-tap reschedule. Не-карательный фрейминг.

```sql
-- Поллер проверяет: events WHERE starts_at - interval '3 hours' < now()
-- AND status = 'active' AND (SELECT COUNT(*) FROM rsvps WHERE event_id = events.id AND status = 'going') < min_players
-- → UPDATE events SET status = 'cancelled' + push всем
```

### Draft Autosave

Черновик события сохраняется в localStorage с debounce 2 сек. Индикатор "Сохранено" на форме. При потере соединения — черновик не теряется. При возврате — форма восстанавливается.

### Коммуникация организатор → участники

Push всем записавшимся с готовыми шаблонами:
- "Начинаем на 30 минут позже"
- "Нужен ещё 1 игрок — поделись!"
- "Локация изменилась на [X]"
- "Ивент подтверждён! До встречи!"

One-tap send из event management view. 160 символов.

### Reliability Score — расширение

Текущая формула + визуальные статусы:
- **Новичок** (< 3 ивентов) — нейтральный бейдж
- **Надёжный** (> 85% явки) — зелёный бейдж
- **Рискованный** (< 60% явки) — жёлтый бейдж

Видно только организаторам на RSVP-листе. Игрок видит СВОЙ score с breakdown: "2 no-show за 3 месяца — для улучшения ходите на ближайшие ивенты". Никаких блокировок. Никаких штрафов. Просто информация.

### Post-Event Feedback

После ивента — 2-question push:
1. "Ивент соответствовал описанию?" (да/нет)
2. "Играли бы с этим организатором снова?" (да/нет)

Приватно, агрегировано. Организатор видит только % — не кто что ответил. Закрывает feedback loop.

```sql
CREATE TABLE event_feedback (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  matched_description BOOLEAN NOT NULL,
  would_play_again    BOOLEAN NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
```

### Event Health Indicator

На карточке ивента: прогресс-бар "5/8 подтверждено" + confidence badge ("Этот организатор обычно заполняет ивенты"). Social proof — игроки записываются быстрее когда видят что "ещё чуть-чуть и наберётся". Computed на лету из event history организатора.

### "Fill My Pod" — Targeted Push

1-2 открытых места за 48ч до ивента. Организатор тапает "Добрать игроков" — платформа шлёт targeted push игрокам в том же городе, формате, с подходящей доступностью по сетке. Не broadcast — точное попадание.

### Organizer Reputation Badge

Публичный "Track record" на карточке ивента:
- Ивентов проведено
- % отмен
- Средняя посещаемость vs capacity
- Бейдж: "Новичок" / "Опытный" / "Ветеран"

Мотивирует организаторов держать качество. Игрок видит — стоит ли идти к первому организатору vs к проверенному.

---

## Волна 3 — Клубы и регулярность (3-4 недели)

### Recurring Events

Серия с шаблоном и паттерном: каждый вторник, каждый четверг, раз в 2 недели. iCal RRULE → автогенерация events за 14 дней. В ленте — одна карточка с бейджем "каждый четверг". Организатор подтверждает одним тапом. Снимает 80% рутины организаторов.

```sql
CREATE TABLE event_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id    UUID NOT NULL REFERENCES profiles(id),
  venue_id        UUID REFERENCES venues(id),
  title           TEXT NOT NULL,
  format          mtg_format NOT NULL,
  city            TEXT NOT NULL,
  description     TEXT,
  fee_text        TEXT,
  min_players     INT,
  max_players     INT,
  intent_tags     TEXT[] DEFAULT '{}',
  proxy_policy    TEXT DEFAULT 'allowed',
  table_language  TEXT DEFAULT 'mixed',
  recurrence_rule TEXT NOT NULL,        -- iCal RRULE: 'FREQ=WEEKLY;BYDAY=TH'
  start_time      TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 240,
  next_at         TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Календарь клуба

Недельный/месячный вид. Владелец видит: зарезервированные слоты (турниры), спонтанные встречи, свободные окна. Каждое событие с RSVP-счётчиком. Быстрое создание нового ивента в пустом слоте.

### Резервация слотов

Владелец блокирует время под турнир. Слот виден как занятый. Quick meetup в этом слоте невозможен.

### Базовая аналитика для клуба

Без BI, но ценная:
- Уникальные игроки в месяц
- Популярные форматы по дням
- Пиковые дни/часы
- Show rate (записался / пришёл по QR)
- Retention: вернулся после первого визита
- Top-5 самых активных игроков

### Calendar Integration (.ics)

После RSVP — "Добавить в Google Calendar / Apple Calendar". Стандартный .ics link. Deep link обратно в ивент. Если MTGx ивенты в твоём календаре — приложение sticky.

---

## Волна 4 — Глубина форматов и discovery (месяц 2-3)

### Commander Brackets

При RSVP на Commander — опционально bracket 1-5 (power level). Организатор видит распределение за столом. В будущем — интеграция с Moxfield API для автооценки деклиста.

```sql
ALTER TABLE events ADD COLUMN commander_bracket INT CHECK (commander_bracket BETWEEN 1 AND 5);
ALTER TABLE rsvps ADD COLUMN declared_bracket INT CHECK (declared_bracket BETWEEN 1 AND 5);
```

### Геолокационный поиск

Карта клубов и событий. Радиус +15 км вместо жёсткой фильтрации по городу. Для Гуш-Дана объединяет ТА, Рамат-Ган, Петах-Тикву, Реховот. "Что рядом сегодня вечером?" — один тап.

### Store Leaderboard

Публичный рейтинг клубов по частоте ивентов, посещаемости, активности. Friendly competition. Discovery для новых игроков.

### Плейстайл-профиль

Мини-анкета (опциональная): casual/competitive, скорость, общительность. Подсветка совместимости на странице ивента: "5 игроков с похожим стилем уже записались." Референс: Nerd Culture, GameTree.

### Сессионные утилиты

Счётчик жизней (Commander с трекингом командирского урона от каждого оппонента), рандомизатор первого игрока, таймер раунда. Каждая минута в MTGx во время игры = retention. Игрок не уходит в другое приложение.

### Referral System

"Пригласи друга → +50 XP тебе и ему + ачивка Recruiter". Deep link с реферальным кодом. Встроенный viral loop.

```sql
ALTER TABLE profiles ADD COLUMN referred_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN referral_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex');
```

---

## Волна 5 — Масштаб и монетизация (Q2+)

### Подписка для магазинов (Freemium B2B)

Базовый функционал бесплатно. Pro за подписку:
- Расширенная аналитика (форматы, retention, churn)
- Приоритетное отображение в поиске
- Брендированные ивенты (кастомные баннеры)
- Безлимитные recurring events (free tier: 2 серии)
- Программа лояльности (Prize Wall) — клуб начисляет баллы привязанные к XP, игроки обменивают на призы

**Игроки не платят никогда.**

### Лиги / Сезоны

Лига на 2-4 недели с гибкими матчами и standings. Промежуточный формат между турниром и встречей. Высокий retention — игроки возвращаются чтобы закрыть сезон. Референс: TopDeck.gg.

```sql
CREATE TABLE seasons (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL,
  format    mtg_format NOT NULL,
  city      TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at   TIMESTAMPTZ NOT NULL,
  status    TEXT NOT NULL DEFAULT 'upcoming'
);
CREATE TABLE league_standings (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season_id     UUID NOT NULL REFERENCES seasons(id),
  user_id       UUID NOT NULL REFERENCES profiles(id),
  points        INT NOT NULL DEFAULT 0,
  events_played INT NOT NULL DEFAULT 0,
  UNIQUE(season_id, user_id)
);
```

### WhatsApp/Telegram бот

Команды: `/events today`, `/lfg pauper tomorrow`, `/my schedule`. Подтверждение и отмена из бота. Кросс-постинг ивентов в клубные чаты. Рост без убеждения ставить приложение.

### Иврит + RTL

Полная локализация. RTL layout. Расширение на ивритоязычную аудиторию.

### Платёжная локализация

Bit / Paybox (израильский стандарт). Для турниров с взносом — оплата через клуб, не через платформу.

### Нативное приложение

Capacitor или React Native. Push без ограничений PWA. Иконка в телефоне = постоянное напоминание.

---

## Что НЕ делать

- Общая лента постов, мемы, новости — есть Discord и WhatsApp
- Трейдинг/обмен картами — другой продукт
- Универсальный чат — убивает фокус
- Субъективные оценки игроков (звёзды/отзывы) — сведение счётов
- Штрафы и блокировки для игроков — отпугивает аудиторию
- Платный функционал для игроков — убивает adoption
- WhatsApp Business API двусторонний бот — 2-6 недель approval Meta, стоимость за сообщение
- GPS-трекинг в реалтайме — Израиль маленький, проблема не "где" а "стоит ли"

---

## Cold Start

1. Вступить в 15-30 MTG WhatsApp-групп Гуш-Дана
2. Найти 5-10 community hubs — людей которые уже организуют игры
3. Выбрать один магазин — не самый большой, а самый "задолбавшийся" от ручной координации
4. Предложить: "Я лично настрою ваши ивенты. Бесплатно."
5. Прийти физически на первый ивент. Онбордить телефон-в-руке (80% конверсия vs 2% по ссылке)
6. **Founder badge** — первые 50 пользователей с QR check-in
7. WhatsApp-симбиоз: шаринг text-блоками которые выглядят как написанные человеком
8. Recap Cards после каждого ивента → organic sharing → FOMO

---

*Roadmap v2. Март 2026.*
