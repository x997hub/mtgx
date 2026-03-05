-- Invitation system: auto-match preferences, invite preferences, player invites

-- ============================================================================
-- 1. Tables
-- ============================================================================

-- Auto-match preferences (notify user when matching events appear)
CREATE TABLE public.auto_match_preferences (
  user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  formats       mtg_format[] NOT NULL DEFAULT '{}',
  event_types   TEXT[] NOT NULL DEFAULT '{"big","quick"}',
  match_days    JSONB NOT NULL DEFAULT '{}',
  radius        TEXT NOT NULL DEFAULT 'my_city' CHECK (radius IN ('my_city','nearby','all')),
  max_daily_notifications INT NOT NULL DEFAULT 3 CHECK (max_daily_notifications BETWEEN 0 AND 20),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_event_types CHECK (event_types <@ ARRAY['big','quick']::TEXT[])
);

CREATE INDEX idx_auto_match_active ON auto_match_preferences USING GIN(formats) WHERE is_active = true;

-- Invite preferences (allow other players to invite you)
CREATE TABLE public.invite_preferences (
  user_id         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_open         BOOLEAN NOT NULL DEFAULT false,
  available_slots JSONB NOT NULL DEFAULT '{}',
  formats         mtg_format[] NOT NULL DEFAULT '{}',
  visibility      TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('all','played_together','my_venues','none')),
  dnd_until       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invite_prefs_open ON invite_preferences USING GIN(formats) WHERE is_open = true;

-- Player invites
CREATE TABLE public.player_invites (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  format          mtg_format,
  message         TEXT CHECK (message IS NULL OR length(message) <= 200),
  proposed_time   TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at    TIMESTAMPTZ,
  CONSTRAINT chk_no_self_invite CHECK (from_user_id != to_user_id)
);

CREATE INDEX idx_invites_to_pending ON player_invites(to_user_id, status) WHERE status = 'pending';
CREATE INDEX idx_invites_from ON player_invites(from_user_id, created_at DESC);
CREATE INDEX idx_invites_expiry ON player_invites(created_at) WHERE status = 'pending';
CREATE UNIQUE INDEX idx_invites_no_dup ON player_invites(from_user_id, to_user_id, COALESCE(event_id, '00000000-0000-0000-0000-000000000000')) WHERE status = 'pending';

-- ============================================================================
-- 2. Triggers (reuse existing fn_set_updated_at)
-- ============================================================================

CREATE TRIGGER trg_auto_match_updated
  BEFORE UPDATE ON auto_match_preferences
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_invite_prefs_updated
  BEFORE UPDATE ON invite_preferences
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- 3. RLS
-- ============================================================================

ALTER TABLE auto_match_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_invites ENABLE ROW LEVEL SECURITY;

-- auto_match_preferences: only own
CREATE POLICY "auto_match_select_own" ON auto_match_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "auto_match_insert_own" ON auto_match_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auto_match_update_own" ON auto_match_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auto_match_delete_own" ON auto_match_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- invite_preferences: own + public is_open for recommendations
CREATE POLICY "invite_prefs_select_own" ON invite_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "invite_prefs_select_public" ON invite_preferences
  FOR SELECT USING (is_open = true);
CREATE POLICY "invite_prefs_insert_own" ON invite_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invite_prefs_update_own" ON invite_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invite_prefs_delete_own" ON invite_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- player_invites: sender + receiver can see, only sender can create, only receiver can respond
CREATE POLICY "invites_select" ON player_invites
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "invites_insert" ON player_invites
  FOR INSERT WITH CHECK (auth.uid() = from_user_id AND status = 'pending');
CREATE POLICY "invites_update_respond" ON player_invites
  FOR UPDATE USING (auth.uid() = to_user_id)
  WITH CHECK (status IN ('accepted', 'declined'));
CREATE POLICY "invites_no_delete" ON player_invites
  FOR DELETE USING (false);

-- ============================================================================
-- 4. RPC: get_recommended_invites
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_recommended_invites(p_event_id UUID)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  city TEXT,
  formats mtg_format[],
  reliability_score NUMERIC,
  played_together BOOLEAN,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_format mtg_format;
  v_city TEXT;
  v_starts_at TIMESTAMPTZ;
  v_organizer_id UUID;
  v_day TEXT;
  v_slot TEXT;
  v_hour INT;
  v_dow INT;
BEGIN
  -- Get event details
  SELECT e.format, e.city, e.starts_at, e.organizer_id
  INTO v_format, v_city, v_starts_at, v_organizer_id
  FROM events e WHERE e.id = p_event_id;

  IF v_format IS NULL THEN
    RETURN;
  END IF;

  -- Compute day_of_week and slot from starts_at
  v_dow := EXTRACT(DOW FROM v_starts_at); -- 0=Sun
  v_day := CASE v_dow
    WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue'
    WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri'
    WHEN 6 THEN 'sat'
  END;

  v_hour := EXTRACT(HOUR FROM v_starts_at);
  v_slot := CASE WHEN v_hour < 17 THEN 'day' ELSE 'evening' END;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.display_name,
    p.city,
    p.formats,
    p.reliability_score,
    EXISTS(
      SELECT 1 FROM rsvps r1
      JOIN rsvps r2 ON r1.event_id = r2.event_id
      WHERE r1.user_id = p.id
        AND r2.user_id = v_organizer_id
        AND r1.status = 'going'
        AND r2.status = 'going'
    ) AS played_together,
    p.avatar_url
  FROM profiles p
  JOIN invite_preferences ip ON ip.user_id = p.id
  WHERE ip.is_open = true
    AND (ip.dnd_until IS NULL OR ip.dnd_until < now())
    AND v_format = ANY(ip.formats)
    AND p.city = v_city
    AND p.id != v_organizer_id
    -- Check available_slots
    AND (ip.available_slots->>(v_day || '_' || v_slot))::boolean = true
    -- Visibility check
    AND (
      ip.visibility = 'all'
      OR (ip.visibility = 'played_together' AND EXISTS(
        SELECT 1 FROM rsvps r1
        JOIN rsvps r2 ON r1.event_id = r2.event_id
        WHERE r1.user_id = p.id AND r2.user_id = v_organizer_id
        AND r1.status = 'going' AND r2.status = 'going'
      ))
      OR (ip.visibility = 'my_venues' AND EXISTS(
        SELECT 1 FROM events ev
        WHERE ev.organizer_id = v_organizer_id
        AND ev.venue_id IS NOT NULL
        AND EXISTS(
          SELECT 1 FROM rsvps r WHERE r.event_id = ev.id AND r.user_id = p.id AND r.status = 'going'
        )
      ))
    )
    -- Not already RSVP'd
    AND NOT EXISTS(
      SELECT 1 FROM rsvps r
      WHERE r.event_id = p_event_id AND r.user_id = p.id AND r.status IN ('going', 'maybe')
    )
    -- Not already invited (pending)
    AND NOT EXISTS(
      SELECT 1 FROM player_invites pi
      WHERE pi.event_id = p_event_id AND pi.to_user_id = p.id AND pi.status = 'pending'
    )
  ORDER BY
    EXISTS(
      SELECT 1 FROM rsvps r1 JOIN rsvps r2 ON r1.event_id = r2.event_id
      WHERE r1.user_id = p.id AND r2.user_id = v_organizer_id
      AND r1.status = 'going' AND r2.status = 'going'
    ) DESC,
    p.reliability_score DESC,
    p.created_at ASC
  LIMIT 50;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_recommended_invites FROM anon;
GRANT EXECUTE ON FUNCTION public.get_recommended_invites TO authenticated;

-- ============================================================================
-- 5. RPC: send_bulk_invites
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_bulk_invites(
  p_event_id UUID,
  p_user_ids UUID[],
  p_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_organizer_id UUID;
  v_uid UUID;
  v_count INT := 0;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check caller is organizer of the event
  SELECT e.organizer_id INTO v_organizer_id
  FROM events e WHERE e.id = p_event_id;

  IF v_organizer_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_organizer_id != v_caller THEN
    -- Non-organizer limit: 5 invites per day
    IF (SELECT COUNT(*) FROM player_invites
        WHERE from_user_id = v_caller
        AND created_at > now() - interval '24 hours') >= 5
    THEN
      RAISE EXCEPTION 'Daily invite limit reached';
    END IF;
  END IF;

  FOREACH v_uid IN ARRAY p_user_ids LOOP
    -- Skip self
    CONTINUE WHEN v_uid = v_caller;

    -- Skip already invited (pending) or already RSVP'd
    CONTINUE WHEN EXISTS(
      SELECT 1 FROM player_invites
      WHERE event_id = p_event_id AND to_user_id = v_uid AND status = 'pending'
    );
    CONTINUE WHEN EXISTS(
      SELECT 1 FROM rsvps
      WHERE event_id = p_event_id AND user_id = v_uid AND status IN ('going', 'maybe')
    );

    INSERT INTO player_invites (from_user_id, to_user_id, event_id, message)
    VALUES (v_caller, v_uid, p_event_id, p_message);

    -- Insert outbox entry for push notification
    INSERT INTO notification_outbox (event_id, type, payload)
    VALUES (p_event_id, 'player_invite', jsonb_build_object(
      'from_user_id', v_caller,
      'to_user_id', v_uid,
      'event_id', p_event_id,
      'message', COALESCE(p_message, '')
    ));

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('invited', v_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_bulk_invites FROM anon;
GRANT EXECUTE ON FUNCTION public.send_bulk_invites TO authenticated;

-- ============================================================================
-- 6. RPC: count_available_players
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_available_players(
  p_city TEXT,
  p_format mtg_format,
  p_day TEXT,
  p_slot TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_slot_key TEXT := p_day || '_' || p_slot;
  v_count INT;
BEGIN
  SELECT COUNT(DISTINCT sub.uid) INTO v_count
  FROM (
    -- From invite_preferences
    SELECT ip.user_id AS uid
    FROM invite_preferences ip
    JOIN profiles p ON p.id = ip.user_id
    WHERE ip.is_open = true
      AND (ip.dnd_until IS NULL OR ip.dnd_until < now())
      AND p_format = ANY(ip.formats)
      AND p.city = p_city
      AND (ip.available_slots->>v_slot_key)::boolean = true

    UNION

    -- From auto_match_preferences
    SELECT amp.user_id AS uid
    FROM auto_match_preferences amp
    JOIN profiles p ON p.id = amp.user_id
    WHERE amp.is_active = true
      AND p_format = ANY(amp.formats)
      AND p.city = p_city
      AND amp.match_days->>v_slot_key IS NOT NULL
      AND amp.match_days->>v_slot_key != 'never'
  ) sub;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.count_available_players FROM anon;
GRANT EXECUTE ON FUNCTION public.count_available_players TO authenticated;
