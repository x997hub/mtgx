import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env"
  );
}

/** Admin client with service_role — bypasses RLS. Do NOT call signInWithPassword on this! */
export const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export { SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY };

// ── Test user helpers ──────────────────────────────────────────────

const TEST_EMAIL = "e2e-test@mtgx.app";
const TEST_PASSWORD = "E2eTestPass123!";

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

/** Create or get existing test user + generate a fresh session.
 *  Uses a SEPARATE anon client for signIn so adminClient stays pristine. */
export async function ensureTestUser(): Promise<TestUser> {
  // Use a separate anon client for signIn (to not pollute adminClient's session)
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Try to sign in first (user may already exist)
  const { data: signInData } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (signInData?.session) {
    return {
      id: signInData.user!.id,
      email: TEST_EMAIL,
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
    };
  }

  // Create user via admin API (uses adminClient which bypasses RLS)
  const { error: createError } =
    await adminClient.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "E2E Test User" },
    });

  if (createError) throw new Error(`Failed to create test user: ${createError.message}`);

  // Sign in with anon client to get session tokens
  const { data: sessionData, error: sessionError } =
    await anonClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

  if (sessionError || !sessionData.session) {
    throw new Error(`Failed to sign in test user: ${sessionError?.message}`);
  }

  return {
    id: sessionData.user!.id,
    email: TEST_EMAIL,
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
}

/** Ensure test user has a profile with admin role (uses adminClient — bypasses RLS) */
export async function ensureTestProfile(userId: string) {
  // Always upsert to guarantee role=admin
  const { data, error } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: userId,
        display_name: "E2E Test User",
        city: "Tel Aviv",
        formats: ["pauper", "commander"],
        role: "admin",
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to create test profile: ${error.message}`);
  return data;
}

// ── Cleanup helpers ────────────────────────────────────────────────

export async function deleteEvent(eventId: string) {
  // Delete RSVPs first (FK constraint)
  await adminClient.from("rsvps").delete().eq("event_id", eventId);
  await adminClient.from("rsvp_history").delete().eq("event_id", eventId);
  const { error } = await adminClient.from("events").delete().eq("id", eventId);
  if (error) console.warn(`Cleanup: failed to delete event ${eventId}:`, error.message);
}

export async function deleteVenue(venueId: string) {
  // Delete photos first
  await adminClient.from("venue_photos").delete().eq("venue_id", venueId);
  // Delete events at this venue
  const { data: events } = await adminClient
    .from("events")
    .select("id")
    .eq("venue_id", venueId);
  for (const e of events || []) {
    await deleteEvent(e.id);
  }
  const { error } = await adminClient.from("venues").delete().eq("id", venueId);
  if (error) console.warn(`Cleanup: failed to delete venue ${venueId}:`, error.message);
}

export async function deleteRsvp(eventId: string, userId: string) {
  await adminClient
    .from("rsvps")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);
}

/** Query the DB to verify a record exists */
export async function getEvent(eventId: string) {
  const { data, error } = await adminClient
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (error) return null;
  return data;
}

export async function getRsvp(eventId: string, userId: string) {
  const { data } = await adminClient
    .from("rsvps")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function getProfile(userId: string) {
  const { data } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

export async function getVenue(venueId: string) {
  const { data } = await adminClient
    .from("venues")
    .select("*")
    .eq("id", venueId)
    .single();
  return data;
}

/** Find recently created events by organizer (for cleanup) */
export async function findRecentEventsByOrganizer(organizerId: string) {
  const { data } = await adminClient
    .from("events")
    .select("id, title, created_at")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false })
    .limit(10);
  return data || [];
}

/** Find venues by owner */
export async function findVenuesByOwner(ownerId: string) {
  const { data } = await adminClient
    .from("venues")
    .select("id, name, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(10);
  return data || [];
}
