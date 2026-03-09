-- Waitlist: join_waitlist RPC + auto-promote trigger on RSVP status change

-- join_waitlist: if spots available -> insert going, else -> insert waitlisted with queue_position
CREATE OR REPLACE FUNCTION join_waitlist(p_event_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_max INT;
  v_going INT;
  v_next_pos SMALLINT;
  v_result JSONB;
BEGIN
  -- Lock event row to prevent race conditions
  SELECT max_players INTO v_max FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;

  -- Count current going
  SELECT COUNT(*)::INT INTO v_going FROM rsvps
    WHERE event_id = p_event_id AND status = 'going';

  IF v_max IS NULL OR v_going < v_max THEN
    -- Spot available: insert as going
    INSERT INTO rsvps (event_id, user_id, status, updated_at)
    VALUES (p_event_id, p_user_id, 'going', now())
    ON CONFLICT (event_id, user_id) DO UPDATE
      SET status = 'going', queue_position = NULL, updated_at = now();

    v_result := jsonb_build_object('status', 'going', 'queue_position', NULL);
  ELSE
    -- Full: compute next queue position with lock
    SELECT COALESCE(MAX(queue_position), 0) + 1 INTO v_next_pos
      FROM rsvps WHERE event_id = p_event_id AND status = 'waitlisted' FOR UPDATE;

    INSERT INTO rsvps (event_id, user_id, status, queue_position, updated_at)
    VALUES (p_event_id, p_user_id, 'waitlisted', v_next_pos, now())
    ON CONFLICT (event_id, user_id) DO UPDATE
      SET status = 'waitlisted', queue_position = v_next_pos, updated_at = now();

    -- Outbox notification for waitlisted user
    INSERT INTO notification_outbox (event_id, type, payload, status)
    VALUES (p_event_id, 'rsvp_waitlisted', jsonb_build_object(
      'event_id', p_event_id,
      'user_id', p_user_id,
      'queue_position', v_next_pos,
      'recipients', jsonb_build_array(p_user_id)
    ), 'pending');

    v_result := jsonb_build_object('status', 'waitlisted', 'queue_position', v_next_pos);
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION join_waitlist(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION join_waitlist(UUID, UUID) TO authenticated;

-- Trigger: auto-promote from waitlist when someone leaves going status
CREATE OR REPLACE FUNCTION trg_rsvp_auto_promote()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when a user leaves 'going' status
  IF OLD.status = 'going' AND NEW.status != 'going' THEN
    PERFORM promote_from_waitlist(NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_rsvp_auto_promote ON rsvps;
CREATE TRIGGER trg_rsvp_auto_promote
  AFTER UPDATE ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION trg_rsvp_auto_promote();

-- Update promote_from_waitlist to include recipients array in outbox payload
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

    -- Shift remaining queue positions down by 1
    UPDATE rsvps SET queue_position = queue_position - 1
      WHERE event_id = p_event_id AND status = 'waitlisted' AND queue_position IS NOT NULL;

    INSERT INTO notification_outbox (event_id, type, payload, status) VALUES
      (p_event_id, 'waitlist_promoted', jsonb_build_object(
        'event_id', p_event_id,
        'user_id', v_next.user_id,
        'recipients', jsonb_build_array(v_next.user_id)
      ), 'pending');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION promote_from_waitlist(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION promote_from_waitlist(UUID) TO authenticated;
