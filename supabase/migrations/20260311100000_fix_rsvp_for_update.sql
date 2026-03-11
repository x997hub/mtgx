-- Fix rsvp_with_lock: FOR UPDATE is not allowed with aggregate functions (COUNT, MAX)
-- Split aggregate queries into separate lock + count steps

CREATE OR REPLACE FUNCTION rsvp_with_lock(
  p_event_id UUID,
  p_user_id UUID,
  p_status rsvp_status,
  p_power_level INT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_current INT;
  v_result RECORD;
  v_queue_pos INT;
BEGIN
  -- Security: only allow own RSVPs (bypassed with service_role where auth.uid() is NULL)
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  -- 1. Lock event row exclusively
  SELECT * INTO v_event FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found'; END IF;

  IF v_event.status != 'active' THEN
    RAISE EXCEPTION 'event_not_active';
  END IF;

  -- 2. Lock going RSVP rows, then count them (FOR UPDATE can't be used with aggregates)
  PERFORM FROM rsvps
    WHERE event_id = p_event_id AND status = 'going' AND user_id != p_user_id
    FOR UPDATE;

  SELECT COUNT(*) INTO v_current FROM rsvps
    WHERE event_id = p_event_id AND status = 'going' AND user_id != p_user_id;

  -- 3. Check capacity
  IF p_status = 'going' AND v_event.max_players IS NOT NULL AND v_current >= v_event.max_players THEN
    RAISE EXCEPTION 'event_full';
  END IF;

  -- 4. For waitlisted status, lock rows then compute queue_position
  IF p_status = 'waitlisted' THEN
    PERFORM FROM rsvps
      WHERE event_id = p_event_id AND status = 'waitlisted'
      FOR UPDATE;

    SELECT COALESCE(MAX(queue_position), 0) + 1 INTO v_queue_pos
      FROM rsvps
      WHERE event_id = p_event_id AND status = 'waitlisted';
  END IF;

  -- 5. Upsert RSVP
  INSERT INTO rsvps (event_id, user_id, status, power_level, queue_position)
  VALUES (p_event_id, p_user_id, p_status, p_power_level,
          CASE WHEN p_status = 'waitlisted' THEN v_queue_pos ELSE NULL END)
  ON CONFLICT (event_id, user_id) DO UPDATE
    SET status = EXCLUDED.status,
        power_level = COALESCE(EXCLUDED.power_level, rsvps.power_level),
        queue_position = CASE WHEN EXCLUDED.status = 'waitlisted'
                              THEN COALESCE(EXCLUDED.queue_position, rsvps.queue_position)
                              ELSE NULL END,
        updated_at = now()
  RETURNING * INTO v_result;

  -- 6. Outbox LAST (after all invariants satisfied)
  INSERT INTO notification_outbox (type, payload, status)
  VALUES ('rsvp_update', jsonb_build_object(
    'event_id', p_event_id, 'user_id', p_user_id, 'status', p_status::text
  ), 'pending');

  RETURN jsonb_build_object('success', true, 'rsvp', row_to_json(v_result));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
