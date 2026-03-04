import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_FORMATS = ["pauper", "commander", "standard", "draft"] as const;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Authenticate user from JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization header" }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const supabaseUser = createClient(supabaseUrl, authHeader.replace("Bearer ", ""), {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/mtgx-api", "");

  try {
    switch (path) {
      case "/rsvp":
        return await handleRsvp(req, supabaseAdmin, user.id);
      case "/events":
        return await handleCreateEvent(req, supabaseAdmin, user.id);
      case "/lfg":
        return await handleLfg(req, supabaseAdmin, user.id);
      case "/admin/assign-role":
        return await handleAssignRole(req, supabaseAdmin, user.id);
      default:
        return jsonResponse({ error: "Not found" }, 404);
    }
  } catch (err) {
    console.error("Unhandled error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

// Pessimistic lock RSVP handler
async function handleRsvp(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const { event_id, status } = body as { event_id?: string; status?: string };

  if (!event_id || !status) {
    return jsonResponse({ error: "event_id and status are required" }, 400);
  }

  if (!["going", "maybe", "not_going"].includes(status)) {
    return jsonResponse({ error: "Invalid status" }, 400);
  }

  // Use RPC for pessimistic locking within a single transaction
  // Lock the event row, check max_players, then upsert RSVP
  const { data, error } = await supabase.rpc("rsvp_with_lock", {
    p_event_id: event_id,
    p_user_id: userId,
    p_status: status,
  });

  // Best-effort fallback: if the RPC doesn't exist yet, do it in application code.
  // NOTE: This path does count-then-upsert without database-level locking, so it is
  // susceptible to a TOCTOU race condition (two concurrent requests could both pass
  // the max_players check). The RPC path (rsvp_with_lock) handles atomicity properly.
  // This fallback uses a simple retry-on-conflict pattern to mitigate the race.
  if (error?.message?.includes("function") && error?.message?.includes("does not exist")) {
    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Check event exists and is active
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id, max_players, status")
        .eq("id", event_id)
        .single();

      if (eventError || !event) {
        return jsonResponse({ error: "Event not found" }, 404);
      }

      if (event.status !== "active" && event.status !== "confirmed") {
        return jsonResponse({ error: "Event is not active" }, 400);
      }

      // Check max_players for 'going' status
      if (status === "going" && event.max_players) {
        const { count } = await supabase
          .from("rsvps")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event_id)
          .eq("status", "going");

        if (count !== null && count >= event.max_players) {
          return jsonResponse({ error: "Event is full" }, 409);
        }
      }

      // Upsert RSVP
      const { data: rsvp, error: rsvpError } = await supabase
        .from("rsvps")
        .upsert(
          { event_id, user_id: userId, status, updated_at: new Date().toISOString() },
          { onConflict: "event_id,user_id" },
        )
        .select()
        .single();

      if (rsvpError) {
        // On conflict or constraint violation, retry
        if (attempt < MAX_RETRIES && (rsvpError.code === "23505" || rsvpError.code === "23514")) {
          continue;
        }
        return jsonResponse({ error: rsvpError.message }, 500);
      }

      return jsonResponse({ rsvp });
    }
  }

  if (error) {
    if (error.message === "event_full") {
      return jsonResponse({ error: "Event is full" }, 409);
    }
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ rsvp: data });
}

// Event creation handler
async function handleCreateEvent(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const { type, title, format, city, starts_at, venue_id, duration_min, min_players, max_players, fee_text, description, cloned_from } = body as Record<string, unknown>;

  if (!format || !city || !starts_at || !type) {
    return jsonResponse({ error: "type, format, city, and starts_at are required" }, 400);
  }

  // Validate format is one of the allowed MTG formats
  if (!VALID_FORMATS.includes(format as typeof VALID_FORMATS[number])) {
    return jsonResponse({ error: `Invalid format. Must be one of: ${VALID_FORMATS.join(", ")}` }, 400);
  }

  // Validate starts_at is a valid date in the future
  const startsAtDate = new Date(starts_at as string);
  if (isNaN(startsAtDate.getTime())) {
    return jsonResponse({ error: "starts_at must be a valid date" }, 400);
  }
  if (startsAtDate.getTime() <= Date.now()) {
    return jsonResponse({ error: "starts_at must be in the future" }, 400);
  }

  // For big events, verify role
  if (type === "big") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!profile || !["organizer", "club_owner", "admin"].includes(profile.role)) {
      return jsonResponse({ error: "Only organizers can create big events" }, 403);
    }
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      organizer_id: userId,
      type,
      title,
      format,
      city,
      starts_at,
      venue_id: venue_id || null,
      duration_min: duration_min || null,
      min_players: min_players || 2,
      max_players: max_players || null,
      fee_text: fee_text || null,
      description: description || null,
      cloned_from: cloned_from || null,
    })
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  // Trigger handles outbox entry automatically
  return jsonResponse({ event }, 201);
}

// LFG signal handler
async function handleLfg(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const { city, formats } = body as { city?: string; formats?: string[] };

  if (!city || !formats || !Array.isArray(formats) || formats.length === 0) {
    return jsonResponse({ error: "city and formats are required" }, 400);
  }

  // Validate all formats are valid MTG format values
  const invalidFormats = formats.filter((f) => !VALID_FORMATS.includes(f as typeof VALID_FORMATS[number]));
  if (invalidFormats.length > 0) {
    return jsonResponse({ error: `Invalid formats: ${invalidFormats.join(", ")}. Must be one of: ${VALID_FORMATS.join(", ")}` }, 400);
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: lfg, error } = await supabase
    .from("looking_for_game")
    .upsert(
      {
        user_id: userId,
        city,
        formats,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ lfg });
}

// Admin role assignment handler
async function handleAssignRole(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  adminId: string,
) {
  // Verify caller is admin
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", adminId)
    .single();

  if (!adminProfile || adminProfile.role !== "admin") {
    return jsonResponse({ error: "Admin access required" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const { user_id, role } = body as { user_id?: string; role?: string };

  if (!user_id || !role) {
    return jsonResponse({ error: "user_id and role are required" }, 400);
  }

  if (!["player", "organizer", "club_owner", "admin"].includes(role)) {
    return jsonResponse({ error: "Invalid role" }, 400);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user_id)
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ profile });
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
