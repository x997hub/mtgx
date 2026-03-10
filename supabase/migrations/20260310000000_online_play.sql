-- Online play support: event modes, platforms, join links
-- Enums
CREATE TYPE event_mode AS ENUM ('in_person', 'online', 'hybrid');
CREATE TYPE online_platform AS ENUM ('spelltable', 'mtgo', 'mtga', 'discord', 'zoom', 'other');

-- Events: new columns
ALTER TABLE events
  ADD COLUMN mode event_mode NOT NULL DEFAULT 'in_person',
  ADD COLUMN online_platform online_platform,
  ADD COLUMN join_link TEXT;

-- CHECK: online/hybrid requires join_link
ALTER TABLE events ADD CONSTRAINT chk_online_has_link
  CHECK (mode = 'in_person' OR join_link IS NOT NULL);

-- CHECK: in_person requires venue_id
ALTER TABLE events ADD CONSTRAINT chk_inperson_has_venue
  CHECK (mode != 'in_person' OR venue_id IS NOT NULL);

-- CHECK: join_link max length
ALTER TABLE events ADD CONSTRAINT chk_join_link_length
  CHECK (join_link IS NULL OR length(join_link) <= 500);

-- LFG: add is_online
ALTER TABLE looking_for_game
  ADD COLUMN is_online BOOLEAN NOT NULL DEFAULT false;

-- Index for mode-based queries
CREATE INDEX idx_events_mode ON events(mode, starts_at) WHERE status = 'active';

-- Update outbox trigger to include online fields
CREATE OR REPLACE FUNCTION fn_outbox_new_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notification_outbox(event_id, type, payload)
  VALUES (NEW.id, 'new_event', jsonb_build_object(
    'event_id', NEW.id,
    'format', NEW.format,
    'city', NEW.city,
    'organizer_id', NEW.organizer_id,
    'venue_id', NEW.venue_id,
    'starts_at', NEW.starts_at,
    'mode', NEW.mode,
    'online_platform', NEW.online_platform,
    'join_link', NEW.join_link
  ));
  RETURN NEW;
END;$$;

-- Validation trigger for event mode consistency
CREATE OR REPLACE FUNCTION validate_event_mode() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Clear online fields for in_person events
  IF NEW.mode = 'in_person' THEN
    NEW.online_platform := NULL;
    NEW.join_link := NULL;
  END IF;
  -- Validate URL format for online/hybrid
  IF NEW.mode IN ('online', 'hybrid') AND NEW.join_link IS NOT NULL THEN
    IF NOT (NEW.join_link ~ '^https?://') THEN
      RAISE EXCEPTION 'join_link_must_be_url';
    END IF;
  END IF;
  -- Clear venue for pure online events
  IF NEW.mode = 'online' THEN
    NEW.venue_id := NULL;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_validate_event_mode
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION validate_event_mode();
