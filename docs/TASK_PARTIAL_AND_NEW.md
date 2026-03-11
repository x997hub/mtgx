# Задание: доработка частичных фич + новые фичи

Порядок выполнения — сверху вниз. Каждый блок — отдельный коммит.

---

## Блок A: Доделка частичных фич

### A1. «Иду сегодня» — выбор длительности сигнала (пункт 5)

**Текущее состояние:** в БД на `looking_for_game` есть `duration_hours SMALLINT DEFAULT 4` и `is_instant BOOLEAN`. В UI (`LFGToggleButton`) выбора длительности нет — используется захардкоженный 24ч TTL.

**Задача:** при активации LFG-сигнала показать селектор длительности: 1ч / 2ч / 3ч / 4ч / 5ч+. Выбранное значение записывается в `duration_hours`. Поле `expires_at` рассчитывается как `now() + interval duration_hours hours`. В `LFGSignalList` показывать оставшееся время рядом с каждым сигналом (например "2ч 15м осталось"). Обновить `useLFG` хук чтобы принимал `durationHours` при активации.

---

### A2. Очередь (waitlist) — доделка (пункт 13)

**Текущее состояние:** enum `waitlisted` добавлен, есть `useWaitlist` хук и `WaitlistBadge`. Хук читает `queue_position` из rsvps, но колонки `queue_position` в таблице rsvps нет. Логика promote (перевод из очереди в going при освобождении места) отсутствует.

**Задача:**
1. Миграция: добавить `queue_position SMALLINT` в `rsvps`
2. RPC `join_waitlist(event_id, user_id)` — вставляет rsvp со статусом `waitlisted` и `queue_position = MAX(queue_position) + 1` для этого события. Проверка: если going < max_players → сразу going, не waitlist
3. RPC `promote_from_waitlist(event_id)` — при отмене RSVP going: найти первого в waitlist (min queue_position), перевести в going, обнулить queue_position, сдвинуть позиции остальных, создать запись в notification_outbox типа `waitlist_promoted`
4. Триггер на rsvps: при UPDATE status из `going` в другой статус → вызвать `promote_from_waitlist`
5. UI: на EventDetailPage если событие полное и пользователь не записан — показать кнопку "Встать в очередь" вместо RSVP. Показать позицию "Вы #N в очереди"
6. В `mtgx-poller` добавить обработку типа `waitlist_promoted` — push уведомление с текстом "Место освободилось! Вы переведены в Going"

---

### A3. Сообщения участникам — отправка из UI (пункт 15)

**Текущее состояние:** таблица `organizer_messages` есть в БД с RLS. Компонент `OrganizerMessagesList` читает и отображает сообщения. Нет UI для отправки и нет внутренней почты.

**Задача:**
1. На `EventDetailPage` для организатора события — кнопка "Написать участникам" → открывает Dialog с textarea (max 500 символов) и кнопкой "Отправить"
2. При отправке: INSERT в `organizer_messages` + создать записи в `notification_outbox` для каждого участника (going + maybe) с типом `organizer_message`
3. Хук `useOrganizerMessages` — query для списка + mutation для отправки
4. Добавить вкладку "Сообщения" в NotificationsPage — отдельный список сообщений от организаторов (отфильтрованных из notifications по типу `organizer_message`). Только входящие, игроки друг другу писать не могут
5. В `mtgx-poller` обработка `organizer_message` — push + in-app notification каждому участнику

---

### A4. Репутация организатора — UI (пункт 18)

**Текущее состояние:** VIEW `organizer_stats` существует в БД (events_total, events_cancelled, cancel_rate, avg_attendance). Нигде не отображается.

**Задача:** на странице профиля организатора (ProfilePage, если role != player) показать блок "Статистика организатора":
- Ивентов проведено: N
- Отмен: N%
- Средняя посещаемость: N

Запрос через `supabase.from('organizer_stats').select('*').eq('organizer_id', userId).single()`. Показывать только на чужих профилях организаторов (не на своём).

---

### A5. Повторяющиеся события — UI создания и управления (пункт 19)

**Текущее состояние:** таблица `event_templates` в БД (organizer_id, venue_id, recurrence_rule, template_data JSONB, is_active). Компонент `RecurringBadge` есть. Нет UI для создания шаблонов и нет логики автогенерации.

**Задача:**
1. На CreateEventPage для организатора — toggle "Сделать регулярным". При включении: выбор паттерна (каждую неделю / раз в 2 недели), выбор дня недели. Формат RRULE: `FREQ=WEEKLY;BYDAY=TH` или `FREQ=WEEKLY;INTERVAL=2;BYDAY=TU`
2. При создании: INSERT в `event_templates` + создать первое событие из шаблона с `template_id`
3. Страница управления шаблонами: `/profile` → секция "Мои регулярные события" — список шаблонов с toggle is_active и кнопкой удаления
4. В `mtgx-poller` добавить job `generateRecurringEvents()` — проверять активные шаблоны, генерировать events на 14 дней вперёд если ещё не созданы. Записывать `last_generated_at`
5. В ленте — `RecurringBadge` на карточке событий у которых template_id != null

---

### A6. Commander Brackets — UI (пункт 24)

**Текущее состояние:** колонка `power_level SMALLINT` (1-5) на rsvps в БД. Нигде не используется.

**Задача:**
1. На EventDetailPage: если формат события = commander и пользователь записан going → показать селектор power level (1-5) с описаниями: 1=Casual / 2=Upgraded / 3=Optimized / 4=Competitive / 5=cEDH
2. При выборе: UPDATE rsvps SET power_level = N
3. Для организатора: на странице события показать распределение power levels записавшихся (миниатюрная гистограмма или просто текст "2×Casual, 3×Optimized, 1×cEDH")
4. Компоненты: `PowerLevelSelector`, `PowerLevelDistribution`

---

## Блок B: Новые фичи

### B1. Автогенерация типов (пункт 3)

**Задача:** 
1. Добавить скрипт в package.json: `"types:gen": "supabase gen types typescript --project-id vayjbjecezomhzzsrthi > src/types/database.types.ts"`
2. Запустить генерацию — полученный файл заменяет текущий ручной `database.types.ts`
3. Пройтись по коду и исправить сломавшиеся типы (новые таблицы: mood_tags, organizer_messages, feedback_reports, event_templates и т.д. должны появиться автоматически)
4. Убрать все `as any`, `as unknown`, `as "profiles"` хаки в хуках и компонентах — теперь типы правильные

---

### B2. Обработка ошибок (пункт 4)

**Задача:** пройтись по всем экранам и добавить понятные error states:
1. Общий `ErrorBoundary` уже есть — проверить что он ловит все страницы
2. На каждой странице с данными: если запрос упал — показать не пустой экран а сообщение "Что-то пошло не так" с кнопкой "Попробовать снова" (retry через `queryClient.invalidateQueries`)
3. RSVP ошибки: "event_full" → toast "Все места заняты", "event_not_active" → toast "Событие отменено", network error → toast "Нет соединения, попробуйте позже"
4. Создание события: валидация формы с inline ошибками (не только toast)
5. LFG: если не удалось активировать — toast с причиной
6. Добавить `OfflineBanner` на AppShell (уже есть компонент — убедиться что подключен)
7. i18n: добавить ключи ошибок в common.json для EN и RU

---

### B3. QR Check-in (пункт 8)

**Задача:**

Миграция:
- `events`: добавить `qr_token UUID DEFAULT gen_random_uuid()`, `checkin_enabled BOOLEAN DEFAULT true`
- `rsvps`: добавить `checked_in_at TIMESTAMPTZ`
- RPC `checkin_by_qr(p_token UUID, p_user_id UUID)` — найти event по qr_token, проверить что user имеет rsvp going, записать checked_in_at. Idempotent (повторный скан не ошибка)

Два потока:
1. **Организатор → клуб:** организатор при создании/открытии события сканирует QR-код клуба (venue). Это привязывает событие к venue. QR клуба — статический, генерируется при создании venue (добавить `venue_qr_token UUID` в venues)
2. **Игрок → организатор:** на EventDetailPage для организатора — кнопка "Показать QR для check-in" → fullscreen QR код (высокий контраст, белый на чёрном). Игрок на своём телефоне нажимает "Сканировать QR" → камера → вызов `checkin_by_qr` → toast "Check-in подтверждён!"

Компоненты:
- `QRDisplay` — fullscreen QR код (библиотека: qrcode.react)
- `QRScanner` — сканер камерой (библиотека: html5-qrcode)
- `CheckInButton` — кнопка "Сканировать QR" на EventDetailPage для игроков
- `ShowQRButton` — кнопка "Показать QR" на EventDetailPage для организатора

npm install: `qrcode.react`, `html5-qrcode`

---

### B4. Теги настроения — редактирование в админке (пункт 10)

**Текущее состояние:** `MoodTagsTab` в админке существует но нужно проверить что он поддерживает полное CRUD.

**Задача:** в админке вкладка "Mood Tags" должна позволять:
1. Видеть список всех тегов (slug, label_en, label_ru, label_he, is_active)
2. Редактировать любое поле inline или через dialog
3. Добавлять новый тег
4. Деактивировать тег (is_active = false) — не удалять, чтобы не сломать существующие события
5. Проверить что `MoodTagsTab` всё это умеет, доделать если нет

---

### B5. Политика прокси — редактирование в админке (пункт 11)

**Текущее состояние:** ProxyPolicySelector и ProxyPolicyBadge есть. Значения захардкожены как enum `proxy_policy` (none/partial/full).

**Задача:** пока enum — менять через админку нечего. Убедиться что:
1. `ProxyPolicySelector` корректно отображается на формах BigEventForm и QuickMeetupForm
2. `ProxyPolicyBadge` показывается на EventCard и EventDetailPage
3. Фильтр по proxy policy в ленте событий (опционально, если не сложно)

---

### B6. Подтверждение участия за 24ч и 3ч (пункт 12)

**Задача:**

Миграция:
- `rsvps`: добавить `confirmed_at TIMESTAMPTZ`
- `events`: добавить `confirmation_deadline_hours INT DEFAULT 24` (за сколько часов до начала просить подтверждение)

В `mtgx-poller` добавить job `sendConfirmationRequests()`:
1. За 24ч до starts_at: найти все события с going RSVPs где confirmed_at IS NULL → отправить push "Подтверди участие" с одной кнопкой. Тип outbox: `confirmation_request_24h`
2. За 3ч до starts_at: повторно тем кто не подтвердил → push "Напоминаем: подтверди участие". Тип: `confirmation_request_3h`
3. При нажатии кнопки в push (или в приложении) → UPDATE rsvps SET confirmed_at = now()

UI:
- На EventDetailPage для организатора: в списке участников — подтверждённые (цветной аватар) и неподтверждённые (серый аватар, полупрозрачный)
- На NotificationsPage: карточка подтверждения с кнопкой "Подтверждаю" (one-tap)
- Никаких штрафов за неподтверждение. Это просто информация для организатора

---

### B7. Аналитика клуба (пункт 22)

**Задача:**

На VenuePage для owner'а клуба — новая вкладка "Аналитика" (или секция внизу):
1. Уникальные игроки за последние 30 дней (COUNT DISTINCT user_id из rsvps JOIN events WHERE venue_id AND checked_in_at IS NOT NULL)
2. Популярные форматы — bar chart или просто список: "Pauper: 12 ивентов, Commander: 8, Draft: 3"
3. Пиковые дни — по дням недели: "Четверг: 15 ивентов, Вторник: 8"
4. Show rate — % записавшихся going кто реально пришёл (checked_in_at IS NOT NULL / total going). Если QR check-in ещё не внедрён — показать заглушку "Данные появятся после включения QR check-in"
5. Retention — сколько игроков вернулись повторно (имели 2+ check-in за 30 дней)

RPC `get_venue_analytics(venue_id, days_back INT DEFAULT 30)` — возвращает JSON с метриками. SECURITY DEFINER, проверка что auth.uid() = owner_id venue.

Компонент: `VenueAnalytics`. Простой, без BI — числа и простые списки.

---

### B8. Карта клубов (пункт 25)

**Задача:**

Миграция: добавить `latitude DOUBLE PRECISION`, `longitude DOUBLE PRECISION` в `venues`. Заполнить координаты для существующих venues (seed или вручную).

Новая страница `/clubs` (заменить текущую заглушку "Coming Soon"):
1. Карта (Google Maps или Leaflet — Leaflet бесплатный, предпочтительнее) с маркерами клубов
2. Список клубов под картой с карточками: название, город, форматы, количество предстоящих событий
3. При клике на маркер — popup с названием и кнопкой "Открыть"
4. Геолокация пользователя (если разрешит) → центрировать карту на нём
5. Без фильтра по радиусу пока — просто все клубы на карте

npm install: `leaflet`, `react-leaflet`, `@types/leaflet`

---

### B9. Профиль стиля игры (пункт 27)

**Задача:**

Миграция: добавить в `profiles`:
- `playstyle TEXT CHECK (playstyle IN ('casual', 'competitive', 'mixed'))` DEFAULT 'mixed'
- `game_speed TEXT CHECK (game_speed IN ('slow', 'medium', 'fast'))` DEFAULT 'medium'
- `social_level TEXT CHECK (social_level IN ('quiet', 'moderate', 'talkative'))` DEFAULT 'moderate'

На ProfileEditPage — новая секция "Стиль игры":
1. Playstyle: 3 кнопки-toggle (Casual / Mixed / Competitive)
2. Скорость: 3 кнопки (Медленная / Средняя / Быстрая)
3. Общительность: 3 кнопки (Тихий / Умеренный / Разговорчивый)

Всё опциональное — можно не заполнять.

На ProfilePage — отображение стиля бейджами.

На EventDetailPage — в списке участников рядом с именем показать иконку стиля (если заполнен): 🎲 casual / ⚔️ competitive.

i18n ключи для EN и RU.

---

## Порядок выполнения

1. B1 (автогенерация типов) — сначала, чтобы убрать хаки с типами
2. B2 (ошибки) — базовая устойчивость
3. A1 (LFG длительность)
4. A2 (waitlist)
5. A3 (сообщения)
6. B6 (подтверждение 24ч/3ч)
7. A4 (репутация организатора)
8. A5 (recurring events)
9. A6 (commander brackets)
10. B3 (QR check-in)
11. B4 (mood tags админка)
12. B5 (proxy policy проверка)
13. B9 (стиль игры)
14. B7 (аналитика клуба) — зависит от QR check-in
15. B8 (карта клубов)
