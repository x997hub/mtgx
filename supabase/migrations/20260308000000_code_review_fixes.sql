-- =============================================================================
-- Code Review Fixes Migration
-- P0: RLS hardening, P1: function fixes + input constraints, P2: outbox dedup
-- =============================================================================

-- =========================================================================
-- P0-1: Fix RLS on profiles — anon must NOT see whatsapp, bio, etc.
--
-- Current state: "profiles_read_all" ON profiles FOR SELECT USING (true)
-- allows anon to read ALL columns including whatsapp.
--
-- Fix: Drop the blanket policy, create two separate ones:
--   - anon: can only see public fields via a restricted view-like approach
--   - authenticated: can see all fields
--
-- NOTE: Postgres RLS cannot restrict columns, only rows. To restrict columns
-- for anon we use a security-barrier view. But the simplest correct fix is:
-- block anon entirely from profiles table and let authenticated read all.
-- Anon doesn't need profile data (app requires login).
-- =========================================================================

DROP POLICY IF EXISTS "profiles_read_all" ON profiles;

-- Authenticated users can read all profile fields
CREATE POLICY "profiles_read_authenticated" ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Anon can only read limited public profile data.
-- We allow anon SELECT but restrict via a security-barrier view below.
-- For the raw table: block anon completely. Public data served via view.
CREATE POLICY "profiles_read_anon" ON profiles FOR SELECT
  TO anon
  USING (false);

-- Create a security-barrier view for public profile data (anon access)
-- This view exposes only safe columns and bypasses RLS via SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE(
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  city TEXT,
  formats mtg_format[],
  reliability_score NUMERIC
) AS $$
  SELECT p.id, p.display_name, p.avatar_url, p.city, p.formats, p.reliability_score
  FROM profiles p;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Allow anon to call this function for public profile browsing
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO authenticated;

-- =========================================================================
-- P0-2: Fix RLS on rsvps — block anon, allow only authenticated
--
-- Current state: "rsvps_read_all" USING (true) — anon can read all RSVPs
-- Fix: Only authenticated users should see RSVPs
-- =========================================================================

DROP POLICY IF EXISTS "rsvps_read_all" ON rsvps;

CREATE POLICY "rsvps_read_authenticated" ON rsvps FOR SELECT
  TO authenticated
  USING (true);

-- =========================================================================
-- P0-3: Fix RLS on availability — block anon, allow only authenticated
--
-- Current state: "avail_read_all" USING (true) — anon can read all
-- Fix: Only authenticated users should see availability data
-- =========================================================================

DROP POLICY IF EXISTS "avail_read_all" ON availability;

CREATE POLICY "avail_read_authenticated" ON availability FOR SELECT
  TO authenticated
  USING (true);

-- =========================================================================
-- P1-4: Fix rsvp_with_lock — use enum type + FOR UPDATE on waitlist count
--
-- Current state (from 20260307000000_fix_merge_gaps.sql):
--   rsvp_with_lock(UUID, UUID, TEXT, INT) — p_status is TEXT
--   Waitlist queue_position count has no FOR UPDATE, creating a race condition
--
-- Fix:
--   - Change p_status to rsvp_status enum (prevents injection of invalid values)
--   - Add FOR UPDATE to the rsvps count query to lock rows and prevent
--     queue_position race conditions
--   - Maintain the same outbox insert behavior
-- =========================================================================

-- Drop all existing overloads first
DO $$
BEGIN
  -- Drop TEXT,INT overload (current)
  BEGIN
    DROP FUNCTION IF EXISTS rsvp_with_lock(UUID, UUID, TEXT, INT);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  -- Drop TEXT overload (old)
  BEGIN
    DROP FUNCTION IF EXISTS rsvp_with_lock(UUID, UUID, TEXT);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  -- Drop rsvp_status overload (very old)
  BEGIN
    DROP FUNCTION IF EXISTS rsvp_with_lock(UUID, UUID, rsvp_status);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

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
  -- Security: only allow own RSVPs
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  -- 1. Lock event row exclusively
  SELECT * INTO v_event FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found'; END IF;

  IF v_event.status != 'active' THEN
    RAISE EXCEPTION 'event_not_active';
  END IF;

  -- 2. Count current going RSVPs with FOR UPDATE to prevent race conditions
  SELECT COUNT(*) INTO v_current FROM rsvps
    WHERE event_id = p_event_id AND status = 'going' AND user_id != p_user_id
    FOR UPDATE;

  -- 3. Check capacity
  IF p_status = 'going' AND v_event.max_players IS NOT NULL AND v_current >= v_event.max_players THEN
    RAISE EXCEPTION 'event_full';
  END IF;

  -- 4. For waitlisted status, compute queue_position with lock to prevent race
  IF p_status = 'waitlisted' THEN
    SELECT COALESCE(MAX(queue_position), 0) + 1 INTO v_queue_pos
    FROM rsvps
    WHERE event_id = p_event_id AND status = 'waitlisted'
    FOR UPDATE;
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

REVOKE EXECUTE ON FUNCTION rsvp_with_lock(UUID, UUID, rsvp_status, INT) FROM anon;
GRANT EXECUTE ON FUNCTION rsvp_with_lock(UUID, UUID, rsvp_status, INT) TO authenticated;

-- =========================================================================
-- P1-5: Fix increment_reliability_score — add lower bound
--
-- Current state: LEAST(1.0, reliability_score + p_delta) — no lower bound
-- Fix: GREATEST(0, LEAST(1.0, ...)) so score stays in [0, 1.0]
-- Also: profiles table has no updated_at column, so remove that reference
-- =========================================================================

CREATE OR REPLACE FUNCTION increment_reliability_score(
  p_user_id UUID,
  p_delta NUMERIC
) RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET reliability_score = GREATEST(0, LEAST(1.0, reliability_score + p_delta))
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Permissions unchanged
REVOKE EXECUTE ON FUNCTION increment_reliability_score(UUID, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION increment_reliability_score(UUID, NUMERIC) TO authenticated;

-- =========================================================================
-- P1-6: Add input length constraints (CHECK constraints)
--
-- Use DO blocks to handle "already exists" gracefully
-- =========================================================================

-- events.title: max 200 chars
DO $$ BEGIN
  ALTER TABLE events ADD CONSTRAINT chk_events_title_length
    CHECK (title IS NULL OR length(title) <= 200);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- events.description: max 5000 chars
DO $$ BEGIN
  ALTER TABLE events ADD CONSTRAINT chk_events_description_length
    CHECK (description IS NULL OR length(description) <= 5000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- events.fee_text: max 200 chars
DO $$ BEGIN
  ALTER TABLE events ADD CONSTRAINT chk_events_fee_text_length
    CHECK (fee_text IS NULL OR length(fee_text) <= 200);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- profiles.display_name: max 100 chars
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT chk_profiles_display_name_length
    CHECK (length(display_name) <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- profiles.bio: max 1000 chars (column added in 20260305000001_profile_enhancements.sql)
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT chk_profiles_bio_length
    CHECK (bio IS NULL OR length(bio) <= 1000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- profiles.whatsapp: max 50 chars
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT chk_profiles_whatsapp_length
    CHECK (whatsapp IS NULL OR length(whatsapp) <= 50);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================================
-- P2-7: Outbox deduplication index
--
-- notification_outbox schema:
--   id UUID PK, event_id UUID, type TEXT, payload JSONB,
--   status outbox_status, attempts INT, last_attempt_at, created_at
--
-- Prevent duplicate outbox entries for the same (type, event_id, user_id) combo.
-- Use a unique index on (type, event_id, payload->>'user_id') for pending items.
-- Only deduplicate pending entries — sent/dead entries are historical.
-- =========================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_dedup
  ON notification_outbox (type, event_id, (payload->>'user_id'))
  WHERE status = 'pending'
    AND payload->>'user_id' IS NOT NULL;

-- For outbox entries without user_id (e.g., new_event), deduplicate on (type, event_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_dedup_no_user
  ON notification_outbox (type, event_id)
  WHERE status = 'pending'
    AND payload->>'user_id' IS NULL
    AND event_id IS NOT NULL;
