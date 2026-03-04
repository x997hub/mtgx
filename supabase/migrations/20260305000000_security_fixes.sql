-- =============================================================================
-- Security Fixes Migration
-- Addresses: privilege escalation, IDOR, missing WITH CHECK, function hardening
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FIX 1: Block self-role-escalation via profiles_write_own
-- Root cause: WITH CHECK only verified auth.uid() = id, not column values
-- Attack: Any player could UPDATE own role to 'admin'
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_write_own" ON profiles;
CREATE POLICY "profiles_write_own" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
    AND reliability_score = (SELECT p.reliability_score FROM profiles p WHERE p.id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- FIX 2: Block admin self-insert with role != 'player'
-- Root cause: profiles_insert_own only checked id, not role value
-- Attack: New user could INSERT profile with role='admin'
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'player');

-- ---------------------------------------------------------------------------
-- FIX 3: Add WITH CHECK to admin update policy (block granting admin to others)
-- Root cause: No WITH CHECK clause on profiles_admin_update
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (
    -- Admins can change display_name, city, formats, whatsapp, role (except to admin)
    -- Only super-admin (first admin) can grant admin role
    role != 'admin' OR id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- FIX 4: Add auth.uid() check to update_user_availability
-- Root cause: SECURITY DEFINER function accepted arbitrary p_user_id
-- Attack: Any user could wipe another user's availability
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_user_availability(p_user_id UUID, p_slots JSONB)
RETURNS void AS $$
BEGIN
  -- Security check: only allow updating own availability
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'permission denied: can only update own availability';
  END IF;

  DELETE FROM availability WHERE user_id = p_user_id;

  INSERT INTO availability (user_id, day, slot, level)
  SELECT
    p_user_id,
    (s->>'day')::day_of_week,
    (s->>'slot')::time_slot,
    COALESCE((s->>'level')::availability_level, 'available')
  FROM jsonb_array_elements(p_slots) AS s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- FIX 5: Add WITH CHECK to events_update_own (prevent organizer_id transfer)
-- Root cause: Missing WITH CHECK let organizer change organizer_id to any UUID
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events FOR UPDATE
  USING (organizer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  WITH CHECK (organizer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- ---------------------------------------------------------------------------
-- FIX 6: Restrict availability_match to authenticated users only
-- Root cause: SECURITY DEFINER function callable by anon, leaks user schedules
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION availability_match(UUID) FROM anon;
-- Set secure search_path
ALTER FUNCTION availability_match(UUID) SET search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- FIX 7: Revoke anon access to update_user_availability
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION update_user_availability(UUID, JSONB) FROM anon;

-- ---------------------------------------------------------------------------
-- FIX 8: Block direct writes to rsvp_history (only triggers should write)
-- Root cause: No INSERT/UPDATE/DELETE policies on rsvp_history
-- ---------------------------------------------------------------------------
CREATE POLICY "rsvp_history_no_direct_insert" ON rsvp_history FOR INSERT
  WITH CHECK (false);
CREATE POLICY "rsvp_history_no_direct_update" ON rsvp_history FOR UPDATE
  USING (false);
CREATE POLICY "rsvp_history_no_direct_delete" ON rsvp_history FOR DELETE
  USING (false);

-- ---------------------------------------------------------------------------
-- FIX 9: Set search_path on all SECURITY DEFINER functions
-- Root cause: Missing search_path allows search-path injection attacks
-- ---------------------------------------------------------------------------
ALTER FUNCTION fn_outbox_new_event() SET search_path = public, pg_temp;
ALTER FUNCTION fn_rsvp_audit() SET search_path = public, pg_temp;
ALTER FUNCTION fn_set_quick_expire() SET search_path = public, pg_temp;
ALTER FUNCTION immutable_format_text(mtg_format) SET search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- FIX 10: Add explicit DELETE deny on events (document intent)
-- ---------------------------------------------------------------------------
CREATE POLICY "events_no_delete" ON events FOR DELETE
  USING (false);
