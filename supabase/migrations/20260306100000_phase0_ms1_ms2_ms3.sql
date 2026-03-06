-- =============================================================================
-- Phase 0 + Milestone 1 + Milestone 2 + Milestone 3
-- Combined migration: RSVP safety, waitlist, confirmation, messages,
-- reputation, feedback, mood tags, proxy policy, recurring events, commander
-- =============================================================================

-- IMPORTANT: ALTER TYPE ADD VALUE cannot be inside a transaction block.
-- These must come first, before any BEGIN/COMMIT.

-- Milestone 1: #2 New RSVP statuses
ALTER TYPE rsvp_status ADD VALUE IF NOT EXISTS 'waitlisted';
ALTER TYPE rsvp_status ADD VALUE IF NOT EXISTS 'pending_confirmation';

-- =============================================================================
-- Everything below runs in an implicit transaction
-- =============================================================================

-- =========================================================================
-- Phase 0.2: Capacity enforcement trigger (last line of defense)
-- =========================================================================

CREATE OR REPLACE FUNCTION check_capacity_before_rsvp()
RETURNS TRIGGER AS $$
DECLARE
  v_max INT;
  v_current INT;
BEGIN
  IF NEW.status != 'going' THEN RETURN NEW; END IF;

  SELECT max_players INTO v_max FROM events WHERE id = NEW.event_id;

  -- If max_players is NULL, no capacity limit
  IF v_max IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_current FROM rsvps
    WHERE event_id = NEW.event_id AND status = 'going' AND user_id != NEW.user_id;

  IF v_current >= v_max THEN
    RAISE EXCEPTION 'capacity_exceeded';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER enforce_rsvp_capacity
  BEFORE INSERT OR UPDATE ON rsvps
  FOR EACH ROW EXECUTE FUNCTION check_capacity_before_rsvp();

-- =========================================================================
-- Phase 0.2: Rewrite rsvp_with_lock RPC
-- Proper order: Lock -> Check -> Insert -> Outbox (LAST)
-- =========================================================================

CREATE OR REPLACE FUNCTION rsvp_with_lock(
  p_event_id UUID,
  p_user_id UUID,
  p_status TEXT
) RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_current INT;
  v_result RECORD;
BEGIN
  -- Security: only allow own RSVPs
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  -- 1. Lock event row exclusively
  SELECT * INTO v_event FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found'; END IF;

  IF v_event.status != 'active' THEN
    RAISE EXCEPTION 'event_not_active';
  END IF;

  -- 2. Count current going RSVPs
  SELECT COUNT(*) INTO v_current FROM rsvps
    WHERE event_id = p_event_id AND status = 'going' AND user_id != p_user_id;

  -- 3. Check capacity
  IF p_status = 'going' AND v_event.max_players IS NOT NULL AND v_current >= v_event.max_players THEN
    RAISE EXCEPTION 'event_full';
  END IF;

  -- 4. Upsert RSVP
  INSERT INTO rsvps (event_id, user_id, status)
  VALUES (p_event_id, p_user_id, p_status::rsvp_status)
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()
  RETURNING * INTO v_result;

  -- 5. Outbox LAST (after all invariants satisfied)
  INSERT INTO notification_outbox (type, payload, status)
  VALUES ('rsvp_update', jsonb_build_object(
    'event_id', p_event_id, 'user_id', p_user_id, 'status', p_status
  ), 'pending');

  RETURN jsonb_build_object('success', true, 'rsvp', row_to_json(v_result));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke/grant (drop old signature first if it exists with rsvp_status param)
DO $$
BEGIN
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS rsvp_with_lock(UUID, UUID, rsvp_status)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

REVOKE EXECUTE ON FUNCTION rsvp_with_lock(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION rsvp_with_lock(UUID, UUID, TEXT) TO authenticated;

-- =========================================================================
-- Milestone 1: #13 Waitlist — queue_position column + promote RPC
-- =========================================================================

ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS queue_position SMALLINT;

CREATE OR REPLACE FUNCTION promote_from_waitlist(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
  v_next RECORD;
BEGIN
  -- Lock event
  PERFORM id FROM events WHERE id = p_event_id FOR UPDATE;

  -- Check if still full
  IF (SELECT COUNT(*) FROM rsvps WHERE event_id = p_event_id AND status = 'going')
     >= (SELECT COALESCE(max_players, 2147483647) FROM events WHERE id = p_event_id) THEN
    RETURN; -- Still full
  END IF;

  -- Promote first in queue
  SELECT * INTO v_next FROM rsvps
    WHERE event_id = p_event_id AND status = 'waitlisted'
    ORDER BY queue_position ASC NULLS LAST LIMIT 1 FOR UPDATE;

  IF FOUND THEN
    UPDATE rsvps SET status = 'going', queue_position = NULL, updated_at = now()
      WHERE id = v_next.id;

    INSERT INTO notification_outbox (type, payload, status) VALUES
      ('waitlist_promoted', jsonb_build_object(
        'event_id', p_event_id,
        'user_id', v_next.user_id
      ), 'pending');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION promote_from_waitlist(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION promote_from_waitlist(UUID) TO authenticated;

-- =========================================================================
-- Milestone 2: #12 Confirmation flags
-- =========================================================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS confirmation_sent_24h BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS confirmation_sent_3h BOOLEAN DEFAULT false;

-- =========================================================================
-- Milestone 2: #15 Organizer messages
-- =========================================================================

CREATE TABLE public.organizer_messages (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES profiles(id),
  body         TEXT NOT NULL CHECK (length(body) <= 500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_messages_event ON organizer_messages(event_id, created_at DESC);

ALTER TABLE organizer_messages ENABLE ROW LEVEL SECURITY;

-- Organizer can write messages for their events
CREATE POLICY "organizer_can_write" ON organizer_messages
  FOR INSERT WITH CHECK (
    auth.uid() = organizer_id
    AND EXISTS (
      SELECT 1 FROM events WHERE id = organizer_messages.event_id
      AND organizer_id = auth.uid()
    )
  );

-- Participants (going/maybe) and the organizer can read
CREATE POLICY "participants_can_read" ON organizer_messages
  FOR SELECT USING (
    auth.uid() = organizer_id OR
    EXISTS (
      SELECT 1 FROM rsvps
      WHERE event_id = organizer_messages.event_id
      AND user_id = auth.uid()
      AND status IN ('going', 'maybe')
    )
  );

-- No update or delete from client
CREATE POLICY "org_messages_no_update" ON organizer_messages FOR UPDATE USING (false);
CREATE POLICY "org_messages_no_delete" ON organizer_messages FOR DELETE USING (false);

-- =========================================================================
-- Milestone 2: #18 Organizer reputation (view)
-- =========================================================================

CREATE OR REPLACE VIEW public.organizer_stats AS
SELECT
  e.organizer_id,
  COUNT(*) AS events_total,
  COUNT(*) FILTER (WHERE e.status = 'cancelled') AS events_cancelled,
  ROUND(
    COUNT(*) FILTER (WHERE e.status = 'cancelled')::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS cancel_rate,
  ROUND(AVG(
    (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'going')
  ), 1) AS avg_attendance
FROM events e
GROUP BY e.organizer_id;

-- =========================================================================
-- Milestone 2: #36 Feedback reports
-- =========================================================================

CREATE TABLE public.feedback_reports (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         UUID REFERENCES profiles(id),
  type            TEXT NOT NULL CHECK (type IN ('bug', 'suggestion', 'question')),
  body            TEXT NOT NULL CHECK (length(body) <= 2000),
  screenshot_url  TEXT,
  page_url        TEXT,
  user_agent      TEXT,
  app_version     TEXT,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_status ON feedback_reports(status) WHERE status != 'closed';
CREATE INDEX idx_feedback_user ON feedback_reports(user_id);

ALTER TABLE feedback_reports ENABLE ROW LEVEL SECURITY;

-- User can read own reports
CREATE POLICY "user_read_own" ON feedback_reports
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can create reports
CREATE POLICY "user_insert" ON feedback_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can read all
CREATE POLICY "admin_read_all_feedback" ON feedback_reports
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Admin can update (status, admin_notes)
CREATE POLICY "admin_update_feedback" ON feedback_reports
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- No client delete
CREATE POLICY "feedback_no_delete" ON feedback_reports FOR DELETE USING (false);

-- Trigger: auto-update updated_at (reuse existing fn_set_updated_at)
CREATE TRIGGER trg_feedback_updated_at
  BEFORE UPDATE ON feedback_reports
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- =========================================================================
-- Milestone 3: #5 Going Today (LFG extensions)
-- =========================================================================

ALTER TABLE looking_for_game ADD COLUMN IF NOT EXISTS duration_hours SMALLINT DEFAULT 4;
ALTER TABLE looking_for_game ADD COLUMN IF NOT EXISTS is_instant BOOLEAN DEFAULT false;

-- =========================================================================
-- Milestone 3: #10 Mood Tags
-- =========================================================================

CREATE TABLE public.mood_tags (
  id        SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug      TEXT UNIQUE NOT NULL,
  label_en  TEXT NOT NULL,
  label_ru  TEXT NOT NULL,
  label_he  TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Seed default mood tags
INSERT INTO mood_tags (slug, label_en, label_ru, label_he) VALUES
  ('casual',      'Casual',      'Казуальная',       'קז''ואלי'),
  ('competitive', 'Competitive', 'Соревновательная',  'תחרותי'),
  ('deck_test',   'Deck Testing','Тест колоды',      'בדיקת חפיסה'),
  ('training',    'Training',    'Обучение',         'אימון');

ALTER TABLE mood_tags ENABLE ROW LEVEL SECURITY;

-- Everyone can read active mood tags
CREATE POLICY "mood_tags_read_all" ON mood_tags
  FOR SELECT USING (true);

-- Only admins can manage mood tags
CREATE POLICY "mood_tags_admin_write" ON mood_tags
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

ALTER TABLE events ADD COLUMN IF NOT EXISTS mood_tags TEXT[] DEFAULT '{}';

-- =========================================================================
-- Milestone 3: #11 Proxy Policy
-- =========================================================================

DO $$ BEGIN
  CREATE TYPE proxy_policy AS ENUM ('none', 'partial', 'full');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE events ADD COLUMN IF NOT EXISTS proxy_policy proxy_policy DEFAULT 'none';

-- =========================================================================
-- Milestone 3: #24 Commander Brackets (power level on RSVP)
-- =========================================================================

ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS power_level SMALLINT;

-- Add constraint separately to handle IF NOT EXISTS pattern
DO $$ BEGIN
  ALTER TABLE rsvps ADD CONSTRAINT chk_power_level
    CHECK (power_level IS NULL OR power_level BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================================
-- Milestone 3: #19 Recurring Events (templates)
-- =========================================================================

CREATE TABLE public.event_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id      UUID NOT NULL REFERENCES profiles(id),
  venue_id          UUID REFERENCES venues(id),
  recurrence_rule   TEXT NOT NULL,
  template_data     JSONB NOT NULL,
  last_generated_at TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_templates_organizer ON event_templates(organizer_id);
CREATE INDEX idx_event_templates_active ON event_templates(is_active) WHERE is_active = true;

ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;

-- Organizer can manage own templates
CREATE POLICY "templates_select_own" ON event_templates
  FOR SELECT USING (auth.uid() = organizer_id);
CREATE POLICY "templates_insert_own" ON event_templates
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "templates_update_own" ON event_templates
  FOR UPDATE USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "templates_delete_own" ON event_templates
  FOR DELETE USING (auth.uid() = organizer_id);

-- Admin can read all templates
CREATE POLICY "templates_admin_read" ON event_templates
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Link events to templates
ALTER TABLE events ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES event_templates(id);
