-- Fix: trigger functions must be SECURITY DEFINER to bypass RLS on internal tables
-- fn_outbox_new_event inserts into notification_outbox which has RLS USING(false)
CREATE OR REPLACE FUNCTION fn_outbox_new_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
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

-- fn_rsvp_audit inserts into rsvp_history — also needs SECURITY DEFINER
CREATE OR REPLACE FUNCTION fn_rsvp_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO rsvp_history(rsvp_id, user_id, event_id, from_status, to_status, hours_before_event)
  SELECT NEW.id, NEW.user_id, NEW.event_id, OLD.status, NEW.status,
    EXTRACT(EPOCH FROM (e.starts_at - now())) / 3600
  FROM events e WHERE e.id = NEW.event_id;
  RETURN NEW;
END;$$;
