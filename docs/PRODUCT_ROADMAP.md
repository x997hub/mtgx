# MTGx — Product Roadmap

> Результат Expert Panel: 4 эксперта (Product Manager, UX Designer, Backend Engineer, Community/Growth Expert), 5 раундов дебатов.
> Полный лог: `Expert Panel/logs/2026-03-05-mtgx-product-roadmap.md`

---

## Корневая проблема

**Дефицит доверия.** Игроки не знают, придут ли другие → не идут → ивенты проваливаются → экосистема умирает. MTGx должен создавать **социальное давление** ("Саша идёт → значит, пойду и я"), а не просто показывать список ивентов.

---

## Phase 1 — Trust Infrastructure (10-12 дней)

**Цель:** Превратить MTGx из "календаря ивентов" в "движок обязательств". Создать ground truth по посещаемости.

### 1.1 rsvp_with_lock (FOR UPDATE SKIP LOCKED)
**Приоритет:** P0 — блокирует всё остальное

**Аргументация:** Текущий код mtgx-api содержит fallback с комментарием "susceptible to TOCTOU race condition". При 10+ одновременных RSVP на популярный ивент возможен overbooking. Без атомарного lock все фичи по reliability и waitlist — на песке.

**Преимущества:**
- Исключает фантомные записи и overbooking
- Позволяет безопасно строить waitlist поверх
- Даёт основу для двухфазного подтверждения в Phase 2

**Реализация:** `SELECT ... FOR UPDATE SKIP LOCKED` в RPC-функции. 2 дня.

### 1.2 QR Check-in
**Приоритет:** P0

**Аргументация:** Без ground truth по посещаемости reliability score, XP, аналитика — всё шум. QR check-in — единственный способ отличить "записался и пришёл" от "записался и не пришёл". Также служит валидацией density: если за 60 дней нет 15 уникальных check-in'ов в городе, социальные фичи бессмысленны.

**Преимущества:**
- Данные для reliability score (уже в схеме)
- Валидация плотности аудитории
- Основа для XP-системы в будущем
- Магазины получают реальную статистику посещаемости

**Реализация:**
- `events`: добавить `qr_token UUID`, `checkin_enabled BOOL`
- `rsvps`: добавить `checked_in_at TIMESTAMPTZ`
- RPC `checkin_by_qr(token, user_id)` — атомарный, idempotent
- Edge Function `generate_qr` — подписанный токен, TTL 24h
- 2 дня.

### 1.3 «Иду сегодня» — One-Tap Availability Signal
**Приоритет:** P1

**Аргументация:** **Единственная фича, создающая триггер открыть приложение.** Объединяет идеи "Bat Signal" (UX), LFG broadcast (Community) и "Fill My Pod" (PM). Ephemeral (2h TTL) — создаёт urgency (MTG-флейвор: "flash" механика). Когда 3+ игроков откликнулись — подсказка "Создать ивент?"

**Преимущества:**
- Заменяет 45-минутный WhatsApp-тред одним тапом
- Социальное давление: "Женя свободен → надо идти"
- Ephemeral = нет спама, нет мёртвых сигналов
- Прямой конкурент поведению "кто свободен?" в чатах

**Реализация:**
- Новая таблица `lfg_signals(user_id, city, format, expires_at)`
- Push-уведомления игрокам в том же городе/формате
- CTA на русском: «Иду сегодня» / «Свободен»
- 2 дня.

### 1.4 Stamp Card (Simple Retention Hook)
**Приоритет:** P2

**Аргументация:** Полная XP-система (6-8 дней) преждевременна — нет данных, что геймификация работает в этом сообществе. Stamp Card (10 ивентов = бейдж) — 1 день, культурно понятен (лояльность через карты), валидирует аппетит к геймификации до инвестиций.

**Преимущества:**
- 1 день разработки вместо 6-8
- Нет новых таблиц — regular VIEW поверх RSVPs
- Видимый прогресс на профиле
- Данные для решения о полной XP-системе

**Важно:** НЕ materialized view (блокировка на Free tier). Обычный VIEW + index на `(user_id, event_id)`.

### 1.5 Draft Autosave + Conflict Modal
**Приоритет:** P2

**Аргументация:** Ивенты создаются в местах со слабым WiFi. Потеря черновика = rage quit. Conflict modal ("Найдена более новая версия с телефона. Использовать?") — сигнал доверия к продукту.

**Преимущества:**
- Предотвращает потерю данных при обрыве связи
- Решает multi-tab проблему (телефон + ноутбук)
- Индикатор "Сохранено / Синхронизируется" — UX-доверие

**Реализация:** Сохранение в БД с debounce 2-3 сек. BroadcastChannel API для multi-tab (с fallback для Safari iOS). 1-2 дня.

### 1.6 Error State UX Pass
**Приоритет:** P1

**Аргументация:** Каждая фича спроектирована для happy path, ни одна — для ошибок. В шумном зале на турнире непонятная модалка = потерянный пользователь навсегда.

**Преимущества:**
- Предотвращает "silent retention killer"
- QR-сбой, конфликт draft, network error — всё покрыто
- 2 дня, но предотвращает churn на месяцы

### 1.7 "Founder" Badge (Cold Start Incentive)
**Приоритет:** P3

**Аргументация:** Первые 50 QR check-in'ов получают эксклюзивный бейдж. Создаёт urgency и early-adopter pride. Не требует XP-системы — просто counter + badge на профиле.

**Phase 1 метрики успеха:**
| Метрика | Target |
|---------|--------|
| Race condition на RSVP | 0 |
| Ивенты с QR check-in | 60%+ |
| «Иду сегодня» → посещение | 20%+ конверсия |
| Уникальные check-in'ы / город / 60 дней | ≥15 |
| Store-партнёры в Gush Dan | 3-5 |
| Draft completion rate | 90%+ |

---

## Phase 2 — Organizer Power + Validation (месяц 2-3)

**Условие входа:** 15 уникальных QR check-in'ов в хотя бы 1 городе за 60 дней.

### 2.1 Intent Tags на ивенты
**Аргументация:** Решает вопрос "какая это игра?" до того, как его зададут в WhatsApp. 5 фиксированных тегов: Casual / Competitive / Deck Testing / Draft / Teaching. Pill chips на карточке ивента.

**Преимущества:** Уменьшает pre-event переписку в WhatsApp. Помогает игрокам фильтровать по стилю игры. Effort: 0.5 дня (TEXT[] + GIN index).

### 2.2 Two-Phase Signup (с A/B тестом)
**Аргументация:** "Заинтересован" → push за 24ч → "Подтверждаю". Решает ghost problem для организаторов. **Обязательно A/B тестировать** — риск снижения общего числа RSVP (UX Designer concern, Round 1).

**Преимущества:** Организатор знает реальное число участников за 24ч. Сокращает no-show rate. Подтверждённые — цветные аватары, неподтверждённые — серые (social proof).

### 2.3 Auto-Cancel at min_players
**Аргументация:** 3ч до старта, если минимум не набран → auto-cancel + push всем + one-tap "Перенести". Не-карательный фрейминг: "Не набрался кворум" вместо "Вы провалились."

**Преимущества:** Предотвращает "поехал зря". Даёт организатору инструмент вместо неловкого отменного сообщения.

### 2.4 Waitlist (FIFO)
**Аргументация:** Позиция видна: "Вы #2 в очереди." При открытии места — push с 30-минутным окном и кнопкой "Занять место". Нужен отдельный RPC `promote_from_waitlist` с атомарным UPDATE.

**Преимущества:** FOMO-механика (social proof: "Ивент заполнен!"). Игроки делятся полными ивентами → вирусный рост. Конверсия waitlist→confirmed target: 75%.

### 2.5 Proxy Policy Toggle
**Аргументация:** 3 варианта: No Proxies / Partial (N карт) / Full Proxy. Убирает главный аргумент pre-event WhatsApp-дискуссий. Иконка на карточке ивента.

**Преимущества:** Effort: 0.5 дня (BOOLEAN). Устраняет policy mismatch — частый source of frustration.

### 2.6 Table Language Flag
**Аргументация:** RU / EN / HE / Mixed — флаги стран на карточке. Вирусный коэффициент MEDIUM-HIGH (Community Expert): русскоязычный игрок, нашедший "русский стол", расскажет всем знакомым.

**Преимущества:** Решает реальную боль Israel-specific. Acquisition channel для русскоязычного сегмента. Effort: 0.5 дня (TEXT column).

### 2.7 Recap Card (Shareable Post-Event Image)
**Аргументация:** После закрытия ивента — shareable card: "Friday Draft at [Store] — 8 players, Format: Duskmourn." Генерация client-side (html2canvas + crossOrigin="anonymous"). MTGx watermark = earned media.

**Преимущества:** Каждый share виден 50-200 людям. Бесплатный маркетинг. Игроки УЖЕ делают это в WhatsApp, мы даём красивый формат.

### 2.8 Stamp Card Animations
**Аргументация:** Только если Phase 1 Stamp Card показал engagement. Card-flip animation (0.8 сек), MTG-стиль.

**Phase 2 метрики:**
| Метрика | Target |
|---------|--------|
| Two-phase confirmation rate | ≥70% RSVPs |
| Auto-cancel accuracy | ≥80% (ивент реально был пустой) |
| Waitlist→confirmed конверсия | ≥75% |
| Recap Card share rate | ≥25% участников |
| Intent tag usage | ≥70% ивентов |

---

## Phase 3 — Discovery + Format Depth (месяцы 3-4)

### 3.1 Recurring Events
**Условие:** 3+ магазинов делают еженедельные ивенты.

**Аргументация:** iCal RRULE → автоматическая генерация events на 14 дней вперёд. Организатор подтверждает одним тапом. В фиде — одна карточка с бейджем "каждый четверг".

**Преимущества:** Снижает organizer burnout (главный risk по Community Expert). Sticky retention — ивенты в календаре = привычка.

### 3.2 Push Templates для организаторов
**Аргументация:** Готовые шаблоны: "Ивент подтверждён!", "Нужен ещё 1 игрок — поделись!", "Локация изменилась." One-tap send. 160 символов, без чата.

**Преимущества:** Сокращает admin overhead (Pain Type C по Store Pitch). Высокая perceived value при минимальных усилиях.

### 3.3 Calendar Integration (.ics)
**Аргументация:** После RSVP — "Добавить в календарь" (Google Calendar / Apple Calendar). Стандартный .ics link, никакого OAuth. Deep link обратно в ивент.

**Преимущества:** Retention tool: если MTGx ивенты в твоём календаре, приложение sticky. Target: 40% confirmed RSVPs добавляют в календарь.

### 3.4 Commander Brackets (Power Level 1-4)
**Аргументация:** Self-report при RSVP. Организатор видит распределение bracket. Решает #1 Commander social problem без rules engine.

**Преимущества:** Commander — самый растущий формат в Israel. Высокая лояльность к поду → evangelism.

### 3.5 QR Code per Event (WhatsApp Sharing)
**Аргументация:** Статический deep-link QR, pre-fills WhatsApp сообщение с RSVP. Zero backend, работает с Day 1.

**Преимущества:** WhatsApp symbiosis без бота. Организатор делится QR в группе.

### 3.6 Club Analytics (Basic)
**Аргументация:** Для магазинов: посещаемость, пиковые дни, формат-популярность, show/no-show по игрокам. Бесплатно в Phase 3, paywall в Phase 4.

**Преимущества:** Acquisition hook для магазинов. Данные, которых у них раньше не было.

### 3.7 Store Leaderboard
**Аргументация:** Публичный рейтинг магазинов по частоте ивентов, посещаемости, satisfaction. Friendly competition между магазинами.

**Преимущества:** Retention для store owners (держат рейтинг). Discovery для игроков.

---

## Phase 4 — Monetization + Scale (Q2+)

### 4.1 Store Subscription Tier
**Условие:** 5+ активных магазинов.
Gates: advanced analytics, priority listing, branded events, unlimited recurring.

### 4.2 Gamification (XP / Achievements)
**Условие:** Stamp Card доказал ценность retention.

Schema (из анализа Backend Engineer):
- `user_xp` — immutable ledger
- `achievements` — definitions
- `user_achievements` — unlocks
- Квадратичная кривая: L1=0, L2=100, L3=400, L4=900 XP
- MTG-тематика: Squire → Apprentice → Mage → Archmage → Planeswalker → Mythic → Eternal

### 4.3 Leagues / Seasons
**Условие:** Стабильные recurring events.
Standings через триггер на rsvp_history. 8-12 дней.

### 4.4 Payment Localization
Bit / Paybox (израильский стандарт), не Stripe.

### 4.5 Telegram Bot (send-only)
**Условие:** WhatsApp sharing данные подтверждают спрос.
НЕ two-way bot. Только уведомления: подтверждение ивента, изменение RSVP, новый ивент рядом.

---

## Anti-Priorities (НЕ СТРОИТЬ)

| Фича | Причина |
|------|---------|
| Session utilities (life counter, randomizer) | MTG Arena, Moxfield делают это лучше. Dilution of focus. |
| Social network (feeds, likes, follows) | WhatsApp — социальный слой. MTGx — координационный. |
| WhatsApp Business API two-way bot | Meta approval 2-6 недель, стоимость за сообщение, support burden. |
| Real-time GPS / location tracking | Israel маленький. Проблема не "где?" а "стоит ли?" |
| Detailed playstyle profiles | Friction при заполнении без downstream use. Infer из истории. |
| Prize Wall / loyalty points (platform-wide) | Бизнес-логика магазина, не платформы. |
| Full XP system before Stamp Card proof | 6-8 дней без данных о retention value. |

---

## Cold Start Plan

### Phase 0 — Reconnaissance (1-2 недели, 0 пользователей)
1. Вступить в каждую MTG WhatsApp-группу в Gush Dan (15-30 групп)
2. Определить 5-10 "community hubs" — людей, которые организуют игры
3. Это Day 1 targets. Не реклама. Не SEO. Эти 5-10 человек.

### Phase 1 — Handcrafted Launch (2-4 неделя, target: 1 магазин, 15 игроков)
1. Выбрать один магазин (не самый большой — самый digitally frustrated)
2. Предложить: "Я лично настрою ваши ивенты. Zero commitment."
3. Прийти на первый ивент физически. Онбордить телефон-в-руке (80%+ конверсия vs 2% по ссылке)
4. Target: 15 зарегистрированных, 1 активный магазин, 1 успешный ивент с QR check-in

### Phase 2 — WhatsApp Parasitism (4-8 неделя, target: 50 игроков, 2-3 магазина)
1. Каждый MTGx ивент генерирует copy-paste блок для WhatsApp (выглядит как human-typed)
2. Организатор вставляет в свою WhatsApp-группу
3. Метрика: 10% click-to-register конверсия

### Phase 3 — Social Proof Loop (8-16 неделя, target: 150 игроков)
1. "3 игрока из вашего района зарегались на этой неделе" — локальные nudges
2. Post-event recap cards → organic sharing
3. Players share results → backlink к MTGx

---

## Критические риски

| Риск | Severity | Митигация |
|------|----------|-----------|
| Store-евангелисты отказываются | Critical | Личные отношения, не product pitch. Начинать с их боли. "Я лично настрою." |
| Chicken-and-egg (нет игроков ↔ нет магазинов) | Critical | Физический онбординг на первом ивенте. 15 игроков минимум. |
| WhatsApp group owners чувствуют угрозу | High | Никогда не позиционировать как замену. Все фичи дополняют WhatsApp. |
| Русскоязычные чурнят на англоязычном UI | Medium | Russian-first онбординг. Перевод УЖЕ есть (ru locale). |
| Offline на площадках (слабый WiFi) | Medium | localStorage fallback. QR работает оффлайн (pre-cached token). |
| RLS policy explosion | Medium | ≤6 политик на hot tables. Консолидация по ролям. |
| Supabase Free tier ограничения | Low | Phase 1 укладывается. Pro ($25/мес) при переходе к Phase 3. |

---

## Технические Prerequisites

1. **rsvp_with_lock** — `FOR UPDATE SKIP LOCKED`, не простой RPC wrapper
2. **supabase gen types** — заменить ручные типы на `supabase gen types typescript`
3. **Разбить mtgx-poller** — отдельные Edge Functions с независимыми retry
4. **RLS consolidation** — ≤6 политик на hot tables (profiles, events, rsvps)
5. **Enum planning** — добавить `pending_confirm`, `waitlist` в `rsvp_status` сразу (ALTER TYPE необратим)
