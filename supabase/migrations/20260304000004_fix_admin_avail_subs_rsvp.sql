-- ==========================================
-- BUG-ADMIN-1: Admin can't change user roles
-- RLS policy profiles_write_own only allows UPDATE where auth.uid()=id.
-- Admin panel needs to update other users' roles.
-- ==========================================
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================
-- BUG-AVAIL: Non-transactional availability update
-- delete-all + insert are two separate operations; if insert fails after delete, data is lost.
-- Fix: Postgres function that does both in a single transaction.
-- ==========================================
CREATE OR REPLACE FUNCTION update_user_availability(p_user_id UUID, p_slots JSONB)
RETURNS void AS $$
BEGIN
  DELETE FROM availability WHERE user_id = p_user_id;
  INSERT INTO availability (user_id, day, slot, level)
  SELECT p_user_id,
         (s->>'day')::day_of_week,
         (s->>'slot')::time_slot,
         COALESCE((s->>'level')::availability_level, 'available')
  FROM jsonb_array_elements(p_slots) s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- BUG-SUB: Subscription upsert creates duplicates with NULL columns
-- UNIQUE constraint with nullable columns doesn't work because NULL != NULL.
-- Fix: unique index using COALESCE for nullable columns.
-- ==========================================
-- Need an immutable wrapper for enum-to-text cast (Postgres considers casts mutable)
CREATE OR REPLACE FUNCTION immutable_format_text(val mtg_format) RETURNS text
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$ SELECT val::text; $$;

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_target_type_target_id_format_city_key;
DROP INDEX IF EXISTS subscriptions_user_id_target_type_target_id_format_city_key;
DROP INDEX IF EXISTS idx_subscriptions_unique;

-- Remove duplicate rows before creating the unique index
DELETE FROM subscriptions a
USING subscriptions b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.target_type = b.target_type
  AND COALESCE(a.target_id, '00000000-0000-0000-0000-000000000000') = COALESCE(b.target_id, '00000000-0000-0000-0000-000000000000')
  AND COALESCE(immutable_format_text(a.format), '') = COALESCE(immutable_format_text(b.format), '')
  AND COALESCE(a.city, '') = COALESCE(b.city, '');

CREATE UNIQUE INDEX idx_subscriptions_unique ON subscriptions(
  user_id, target_type,
  COALESCE(target_id, '00000000-0000-0000-0000-000000000000'),
  COALESCE(immutable_format_text(format), ''),
  COALESCE(city, '')
);

-- ==========================================
-- BUG-RSVP-HISTORY: rsvp_history has no RLS policies
-- Users should read their own history, admins can read all.
-- ==========================================
ALTER TABLE rsvp_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rsvp_history_read_own" ON rsvp_history;
CREATE POLICY "rsvp_history_read_own" ON rsvp_history FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================
-- BUG-RSVP-UPDATED: rsvps.updated_at not auto-updated on UPDATE
-- ==========================================
CREATE OR REPLACE FUNCTION fn_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rsvps_updated_at ON rsvps;
CREATE TRIGGER trg_rsvps_updated_at BEFORE UPDATE ON rsvps
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
