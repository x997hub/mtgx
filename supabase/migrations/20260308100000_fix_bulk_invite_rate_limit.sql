-- Fix TOCTOU race condition in send_bulk_invites rate-limit check.
-- Use pg_advisory_xact_lock to serialize rate-limit checks per user,
-- preventing two concurrent calls from both passing the count check.

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
    -- Acquire advisory lock keyed on caller's user ID to serialize rate-limit checks.
    -- hashtext() converts UUID to int for use as lock key.
    PERFORM pg_advisory_xact_lock(hashtext(v_caller::text));

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
