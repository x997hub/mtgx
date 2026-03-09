-- QR Check-in: event QR tokens, venue QR tokens, checked_in_at, checkin function

ALTER TABLE events ADD COLUMN IF NOT EXISTS qr_token UUID DEFAULT gen_random_uuid();
ALTER TABLE events ADD COLUMN IF NOT EXISTS checkin_enabled BOOLEAN DEFAULT true;

ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

ALTER TABLE venues ADD COLUMN IF NOT EXISTS venue_qr_token UUID DEFAULT gen_random_uuid();

-- Idempotent check-in function: find event by qr_token, verify going RSVP, set checked_in_at
CREATE OR REPLACE FUNCTION checkin_by_qr(p_token UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_rsvp RECORD;
BEGIN
  -- Find event by QR token
  SELECT id, title, checkin_enabled INTO v_event
    FROM events WHERE qr_token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;

  IF NOT v_event.checkin_enabled THEN
    RAISE EXCEPTION 'checkin_disabled';
  END IF;

  -- Find user's RSVP
  SELECT id, status, checked_in_at INTO v_rsvp
    FROM rsvps
    WHERE event_id = v_event.id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_rsvp';
  END IF;

  IF v_rsvp.status != 'going' THEN
    RAISE EXCEPTION 'not_going';
  END IF;

  -- Idempotent: if already checked in, just return success
  IF v_rsvp.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'event_id', v_event.id,
      'already_checked_in', true,
      'checked_in_at', v_rsvp.checked_in_at
    );
  END IF;

  -- Set checked_in_at
  UPDATE rsvps SET checked_in_at = now(), updated_at = now()
    WHERE id = v_rsvp.id;

  RETURN jsonb_build_object(
    'event_id', v_event.id,
    'already_checked_in', false,
    'checked_in_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION checkin_by_qr(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION checkin_by_qr(UUID, UUID) TO authenticated;
