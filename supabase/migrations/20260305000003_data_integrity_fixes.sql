-- =============================================================================
-- Data Integrity Fixes
-- B5: notifications WITH CHECK, B6: atomic RSVP, B7: LFG formats check
-- =============================================================================

-- ---------------------------------------------------------------------------
-- B5: Add WITH CHECK to notifications RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "notif_own" ON notifications;
CREATE POLICY "notif_own" ON notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- B6: Atomic RSVP with max_players lock
-- Prevents race condition where multiple users RSVP simultaneously past max_players
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rsvp_with_lock(
  p_event_id UUID,
  p_user_id UUID,
  p_status rsvp_status
) RETURNS jsonb AS $$
DECLARE
  v_event events%ROWTYPE;
  v_going_count INT;
  v_result jsonb;
BEGIN
  -- Security: only allow own RSVPs
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'permission denied: can only RSVP as yourself';
  END IF;

  -- Lock the event row to prevent concurrent reads
  SELECT * INTO v_event FROM events WHERE id = p_event_id FOR UPDATE;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object('error', 'event_not_found');
  END IF;

  IF v_event.status != 'active' THEN
    RETURN jsonb_build_object('error', 'event_not_active');
  END IF;

  -- Check max_players only for 'going' status
  IF p_status = 'going' AND v_event.max_players IS NOT NULL THEN
    SELECT COUNT(*) INTO v_going_count
    FROM rsvps
    WHERE event_id = p_event_id AND status = 'going' AND user_id != p_user_id;

    IF v_going_count >= v_event.max_players THEN
      RETURN jsonb_build_object('error', 'event_full');
    END IF;
  END IF;

  -- Upsert the RSVP
  INSERT INTO rsvps (event_id, user_id, status)
  VALUES (p_event_id, p_user_id, p_status)
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()
  RETURNING jsonb_build_object('id', id, 'event_id', event_id, 'user_id', user_id, 'status', status)
  INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant to authenticated users only
REVOKE EXECUTE ON FUNCTION rsvp_with_lock(UUID, UUID, rsvp_status) FROM anon;
GRANT EXECUTE ON FUNCTION rsvp_with_lock(UUID, UUID, rsvp_status) TO authenticated;

-- ---------------------------------------------------------------------------
-- B7: LFG formats must not be empty
-- ---------------------------------------------------------------------------
ALTER TABLE looking_for_game ADD CONSTRAINT chk_lfg_formats_nonempty
  CHECK (array_length(formats, 1) > 0);

-- ---------------------------------------------------------------------------
-- Events: max_players >= min_players when both set
-- ---------------------------------------------------------------------------
ALTER TABLE events ADD CONSTRAINT chk_max_gte_min_players
  CHECK (max_players IS NULL OR max_players >= min_players);
