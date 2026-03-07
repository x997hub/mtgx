-- =============================================================================
-- Fix merge gaps: missing column, missing RPCs
-- =============================================================================

-- 1. Add confirmed_at column to rsvps (used by handleConfirmAttendance)
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- 2. RPC: increment_reliability_score (used by handleConfirmAttendance)
CREATE OR REPLACE FUNCTION increment_reliability_score(
  p_user_id UUID,
  p_delta NUMERIC
) RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET reliability_score = LEAST(1.0, reliability_score + p_delta),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION increment_reliability_score(UUID, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION increment_reliability_score(UUID, NUMERIC) TO authenticated;

-- 3. RPC: check_played_together (used by invite visibility check)
CREATE OR REPLACE FUNCTION check_played_together(
  p_user1 UUID,
  p_user2 UUID
) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM rsvps r1
    JOIN rsvps r2 ON r1.event_id = r2.event_id
    WHERE r1.user_id = p_user1
    AND r2.user_id = p_user2
    AND r1.status = 'going'
    AND r2.status = 'going'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION check_played_together(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION check_played_together(UUID, UUID) TO authenticated;

-- 4. Update rsvp_with_lock to accept power_level
CREATE OR REPLACE FUNCTION rsvp_with_lock(
  p_event_id UUID,
  p_user_id UUID,
  p_status TEXT,
  p_power_level INT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_current INT;
  v_result RECORD;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  SELECT * INTO v_event FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found'; END IF;

  IF v_event.status != 'active' THEN
    RAISE EXCEPTION 'event_not_active';
  END IF;

  SELECT COUNT(*) INTO v_current FROM rsvps
    WHERE event_id = p_event_id AND status = 'going' AND user_id != p_user_id;

  IF p_status = 'going' AND v_event.max_players IS NOT NULL AND v_current >= v_event.max_players THEN
    RAISE EXCEPTION 'event_full';
  END IF;

  INSERT INTO rsvps (event_id, user_id, status, power_level)
  VALUES (p_event_id, p_user_id, p_status::rsvp_status, p_power_level)
  ON CONFLICT (event_id, user_id) DO UPDATE
    SET status = EXCLUDED.status,
        power_level = COALESCE(EXCLUDED.power_level, rsvps.power_level),
        updated_at = now()
  RETURNING * INTO v_result;

  INSERT INTO notification_outbox (type, payload, status)
  VALUES ('rsvp_update', jsonb_build_object(
    'event_id', p_event_id, 'user_id', p_user_id, 'status', p_status
  ), 'pending');

  RETURN jsonb_build_object('success', true, 'rsvp', row_to_json(v_result));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Drop old signatures
DO $$
BEGIN
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS rsvp_with_lock(UUID, UUID, rsvp_status)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS rsvp_with_lock(UUID, UUID, TEXT)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

REVOKE EXECUTE ON FUNCTION rsvp_with_lock(UUID, UUID, TEXT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION rsvp_with_lock(UUID, UUID, TEXT, INT) TO authenticated;
