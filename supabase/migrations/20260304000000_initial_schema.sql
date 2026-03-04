-- ==========================================
-- MTG Meetup Platform — Initial Schema
-- ==========================================

-- ENUMS
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
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     TEXT NOT NULL,
  city             TEXT NOT NULL,
  formats          mtg_format[] NOT NULL DEFAULT '{}',
  whatsapp         TEXT,
  role             user_role NOT NULL DEFAULT 'player',
  reliability_score NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_profiles_formats ON profiles USING GIN(formats);

-- ==========================================
-- AVAILABILITY (14 rows per user: 7 days x 2 slots)
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
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID NOT NULL REFERENCES profiles(id),
  name              TEXT NOT NULL,
  city              TEXT NOT NULL,
  address           TEXT NOT NULL,
  hours             JSONB,
  capacity          INT,
  contacts          JSONB,
  supported_formats mtg_format[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
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
  fee_text        TEXT,
  description     TEXT,
  status          event_status NOT NULL DEFAULT 'active',
  cloned_from     UUID REFERENCES events(id),
  expires_at      TIMESTAMPTZ,
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
-- RSVP HISTORY (audit for reliability score)
-- ==========================================
CREATE TABLE public.rsvp_history (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rsvp_id            BIGINT NOT NULL REFERENCES rsvps(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES profiles(id),
  event_id           UUID NOT NULL REFERENCES events(id),
  from_status        rsvp_status,
  to_status          rsvp_status NOT NULL,
  hours_before_event NUMERIC,
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rsvp_history_user ON rsvp_history(user_id);

-- ==========================================
-- SUBSCRIPTIONS
-- ==========================================
CREATE TABLE public.subscriptions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type subscription_target NOT NULL,
  target_id   UUID,
  format      mtg_format,
  city        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type, target_id, format, city)
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_target ON subscriptions(target_type, target_id);

-- ==========================================
-- LOOKING FOR GAME
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
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- NOTIFICATION OUTBOX
-- ==========================================
CREATE TABLE public.notification_outbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  type            TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status          outbox_status NOT NULL DEFAULT 'pending',
  attempts        INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbox_pending ON notification_outbox(created_at)
  WHERE status = 'pending';

-- ==========================================
-- NOTIFICATION SENT (deduplication)
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
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id   UUID REFERENCES events(id) ON DELETE SET NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
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

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_write_own" ON profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avail_read_all" ON availability FOR SELECT USING (true);
CREATE POLICY "avail_write_own" ON availability FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_read" ON events FOR SELECT
  USING (status != 'cancelled' OR organizer_id = auth.uid());
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

ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rsvps_read_all" ON rsvps FOR SELECT USING (true);
CREATE POLICY "rsvps_write_own" ON rsvps FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venues_read_all" ON venues FOR SELECT USING (true);
CREATE POLICY "venues_write_owner" ON venues FOR ALL
  USING (owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

ALTER TABLE venue_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_photos_read_all" ON venue_photos FOR SELECT USING (true);
CREATE POLICY "venue_photos_write_owner" ON venue_photos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM venues WHERE venues.id = venue_photos.venue_id
    AND (venues.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ))
  ));

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_own" ON subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE looking_for_game ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lfg_read_active" ON looking_for_game FOR SELECT
  USING (expires_at > now());
CREATE POLICY "lfg_write_own" ON looking_for_game FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON notifications FOR ALL
  USING (auth.uid() = user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_own" ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_sent ENABLE ROW LEVEL SECURITY;

ALTER TABLE admin_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_reports_read" ON admin_reports FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ==========================================
-- TRIGGERS
-- ==========================================

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

CREATE OR REPLACE FUNCTION fn_set_quick_expire() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type = 'quick' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.starts_at + interval '24 hours';
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_set_quick_expire BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION fn_set_quick_expire();

-- ==========================================
-- FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION availability_match(p_event_id UUID)
RETURNS TABLE(user_id UUID) AS $$
DECLARE
  v_event events%ROWTYPE;
  v_dow   day_of_week;
  v_slot  time_slot;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id;

  v_dow := CASE EXTRACT(DOW FROM v_event.starts_at)
    WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue'
    WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri'
    WHEN 6 THEN 'sat'
  END::day_of_week;

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
