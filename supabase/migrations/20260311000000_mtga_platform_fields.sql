-- MTGA and platform-specific fields: platform_username + contact_link
-- MTGA has no join link; players connect via Arena username + WhatsApp

-- New columns
ALTER TABLE events
  ADD COLUMN platform_username TEXT,
  ADD COLUMN contact_link TEXT;

-- Relax: online events need join_link OR contact_link (not always join_link)
ALTER TABLE events DROP CONSTRAINT chk_online_has_link;
ALTER TABLE events ADD CONSTRAINT chk_online_has_link
  CHECK (mode = 'in_person' OR join_link IS NOT NULL OR contact_link IS NOT NULL);

-- Length constraints
ALTER TABLE events ADD CONSTRAINT chk_contact_link_length
  CHECK (contact_link IS NULL OR length(contact_link) <= 500);
ALTER TABLE events ADD CONSTRAINT chk_platform_username_length
  CHECK (platform_username IS NULL OR length(platform_username) <= 100);

-- Update validation trigger to handle new fields
CREATE OR REPLACE FUNCTION validate_event_mode() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Clear online fields for in_person events
  IF NEW.mode = 'in_person' THEN
    NEW.online_platform := NULL;
    NEW.join_link := NULL;
    NEW.platform_username := NULL;
    NEW.contact_link := NULL;
  END IF;
  -- Validate URL format for join_link
  IF NEW.mode IN ('online', 'hybrid') AND NEW.join_link IS NOT NULL THEN
    IF NOT (NEW.join_link ~ '^https?://') THEN
      RAISE EXCEPTION 'join_link_must_be_url';
    END IF;
  END IF;
  -- Validate URL format for contact_link
  IF NEW.contact_link IS NOT NULL THEN
    IF NOT (NEW.contact_link ~ '^https?://') THEN
      RAISE EXCEPTION 'contact_link_must_be_url';
    END IF;
  END IF;
  -- Clear venue for pure online events
  IF NEW.mode = 'online' THEN
    NEW.venue_id := NULL;
  END IF;
  RETURN NEW;
END;$$;

-- Update outbox trigger to include new fields
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
    'join_link', NEW.join_link,
    'platform_username', NEW.platform_username,
    'contact_link', NEW.contact_link
  ));
  RETURN NEW;
END;$$;
