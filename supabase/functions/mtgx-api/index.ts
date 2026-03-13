import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "*";
if (allowedOrigin === "*") {
  console.warn("[mtgx-api] ALLOWED_ORIGIN not set — CORS is open to all origins. Set ALLOWED_ORIGIN env var in production.");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

const VALID_FORMATS = ["pauper", "commander", "standard", "draft"] as const;
const VALID_EVENT_MODES = ["in_person", "online", "hybrid"] as const;
const VALID_ONLINE_PLATFORMS = ["spelltable", "mtgo", "mtga", "discord", "zoom", "other"] as const;
const VALID_EVENT_STATUSES = ["active", "confirmed", "cancelled", "expired", "completed"] as const;
const VALID_RSVP_STATUSES = ["going", "maybe", "not_going", "waitlisted"] as const;
const HOURS_24_MS = 24 * 60 * 60 * 1000;
const DAILY_INVITE_LIMIT = 5;
const MAX_INVITE_MESSAGE_LEN = 200;
const MAX_EVENT_MESSAGE_LEN = 500;
const MAX_FEEDBACK_BODY_LEN = 2000;
const MAX_TITLE_LEN = 200;
const MAX_DESCRIPTION_LEN = 5000;
const MAX_FEE_TEXT_LEN = 200;

async function parseRequestBody(req: Request): Promise<Record<string, unknown> | Response> {
  try {
    return await req.json();
  } catch (err) {
    console.error("Failed to parse request body:", err);
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
}

async function checkDailyInviteLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("player_invites")
    .select("*", { count: "exact", head: true })
    .eq("from_user_id", userId)
    .gte("created_at", new Date(Date.now() - HOURS_24_MS).toISOString());
  return count !== null && count >= DAILY_INVITE_LIMIT;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Authenticate user from JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization header" }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const supabaseUser = createClient(supabaseUrl, anonKey, {
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
      case "/events/cancel":
        return await handleCancelEvent(req, supabaseAdmin, user.id);
      case "/lfg":
        return await handleLfg(req, supabaseAdmin, user.id);
      case "/admin/assign-role":
        return await handleAssignRole(req, supabaseAdmin, user.id);
      case "/admin/stats":
        return await handleAdminStats(req, supabaseAdmin, user.id);
      case "/admin/users":
        return await handleAdminUsers(req, supabaseAdmin, user.id);
      case "/invites":
        if (req.method === "GET") return await handleGetInvites(req, supabaseAdmin, user.id);
        if (req.method === "POST") return await handleSendInvite(req, supabaseAdmin, user.id);
        return jsonResponse({ error: "Method not allowed" }, 405);
      case "/invites/respond":
        return await handleRespondInvite(req, supabaseAdmin, user.id);
      case "/event-message":
        return await handleEventMessage(req, supabaseAdmin, user.id);
      case "/confirm-attendance":
        return await handleConfirmAttendance(req, supabaseAdmin, user.id);
      case "/feedback":
        return await handleFeedback(req, supabaseAdmin, user.id);
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
  const bodyOrError = await parseRequestBody(req);
  if (bodyOrError instanceof Response) return bodyOrError;
  const body = bodyOrError;
  const { event_id, status, power_level } = body as {
    event_id?: string;
    status?: string;
    power_level?: number;
  };

  if (!event_id || !status) {
    return jsonResponse({ error: "event_id and status are required" }, 400);
  }

  if (!VALID_RSVP_STATUSES.includes(status as typeof VALID_RSVP_STATUSES[number])) {
    return jsonResponse({ error: `Invalid status. Must be one of: ${VALID_RSVP_STATUSES.join(", ")}` }, 400);
  }

  // Use RPC for pessimistic locking within a single transaction
  // Lock the event row, check max_players, then upsert RSVP
  const { data, error } = await supabase.rpc("rsvp_with_lock", {
    p_event_id: event_id,
    p_user_id: userId,
    p_status: status,
    p_power_level: power_level ?? null,
  });

  if (error) {
    // Handle event_full: automatically waitlist the player
    if (error.message === "event_full") {
      const nextPosition = await getNextQueuePosition(supabase, event_id);
      const { data: rsvp, error: waitlistError } = await supabase
        .from("rsvps")
        .upsert(
          {
            event_id,
            user_id: userId,
            status: "waitlisted",
            queue_position: nextPosition,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "event_id,user_id" },
        )
        .select()
        .single();

      if (waitlistError) {
        console.error("[mtgx-api] Error:", waitlistError.message);
        return jsonResponse({ error: "Internal server error" }, 500);
      }

      // Create outbox entry for waitlist notification
      await supabase.from("notification_outbox").insert({
        event_id,
        type: "rsvp_waitlisted",
        payload: {
          event_id,
          user_id: userId,
          queue_position: nextPosition,
          recipients: [userId],
        },
      });

      return jsonResponse({ rsvp, waitlisted: true });
    }

    if (error.message === "event_not_found") {
      return jsonResponse({ error: "Event not found" }, 404);
    }

    console.error("[mtgx-api] Error:", error.message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  return jsonResponse({ rsvp: data });
}

// Get next queue position for waitlist
async function getNextQueuePosition(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
): Promise<number> {
  const { data } = await supabase
    .from("rsvps")
    .select("queue_position")
    .eq("event_id", eventId)
    .eq("status", "waitlisted")
    .order("queue_position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.queue_position ?? 0) + 1;
}

// Event creation handler
async function handleCreateEvent(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const bodyOrError = await parseRequestBody(req);
  if (bodyOrError instanceof Response) return bodyOrError;
  const body = bodyOrError;
  const { type, title, format, city, starts_at, venue_id, duration_min, min_players, max_players, fee_text, description, cloned_from, mode, online_platform, join_link, platform_username, contact_link } = body as Record<string, unknown>;

  const eventMode = (mode as string) || "in_person";

  if (!format || !starts_at || !type) {
    return jsonResponse({ error: "type, format, and starts_at are required" }, 400);
  }

  // For in_person/hybrid events, city is required
  if (eventMode !== "online" && !city) {
    return jsonResponse({ error: "city is required for in_person and hybrid events" }, 400);
  }

  // Validate mode
  if (!VALID_EVENT_MODES.includes(eventMode as typeof VALID_EVENT_MODES[number])) {
    return jsonResponse({ error: `Invalid mode. Must be one of: ${VALID_EVENT_MODES.join(", ")}` }, 400);
  }

  // Validate online_platform if provided
  if (online_platform && !VALID_ONLINE_PLATFORMS.includes(online_platform as typeof VALID_ONLINE_PLATFORMS[number])) {
    return jsonResponse({ error: `Invalid online_platform. Must be one of: ${VALID_ONLINE_PLATFORMS.join(", ")}` }, 400);
  }

  // Validate field lengths
  if (typeof title === "string" && title.length > MAX_TITLE_LEN) {
    return jsonResponse({ error: `title must be ${MAX_TITLE_LEN} characters or less` }, 400);
  }
  if (typeof description === "string" && description.length > MAX_DESCRIPTION_LEN) {
    return jsonResponse({ error: `description must be ${MAX_DESCRIPTION_LEN} characters or less` }, 400);
  }
  if (typeof fee_text === "string" && fee_text.length > MAX_FEE_TEXT_LEN) {
    return jsonResponse({ error: `fee_text must be ${MAX_FEE_TEXT_LEN} characters or less` }, 400);
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

  // For online mode, default city to "Online" if not provided
  const eventCity = eventMode === "online" ? ((city as string) || "Online") : city;

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      organizer_id: userId,
      type,
      title,
      format,
      city: eventCity,
      starts_at,
      venue_id: venue_id || null,
      duration_min: duration_min || null,
      min_players: min_players || 2,
      max_players: max_players || null,
      fee_text: fee_text || null,
      description: description || null,
      cloned_from: cloned_from || null,
      mode: eventMode,
      online_platform: online_platform || null,
      join_link: join_link || null,
      platform_username: platform_username || null,
      contact_link: contact_link || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[mtgx-api] Error:", error.message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  // Trigger handles outbox entry automatically
  return jsonResponse({ event }, 201);
}

// Cancel event handler
async function handleCancelEvent(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  if (req.method !== "PATCH") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const bodyOrError = await parseRequestBody(req);
  if (bodyOrError instanceof Response) return bodyOrError;
  const body = bodyOrError;
  const { event_id } = body as { event_id?: string };

  if (!event_id) {
    return jsonResponse({ error: "event_id is required" }, 400);
  }

  // Get event and verify ownership
  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select("id, organizer_id, status, title")
    .eq("id", event_id)
    .single();

  if (fetchError || !event) {
    return jsonResponse({ error: "Event not found" }, 404);
  }

  if (event.organizer_id !== userId) {
    return jsonResponse({ error: "Only the organizer can cancel this event" }, 403);
  }

  if (event.status === "cancelled") {
    return jsonResponse({ error: "Event is already cancelled" }, 400);
  }

  // Update status to cancelled
  const { data: updated, error: updateError } = await supabase
    .from("events")
    .update({ status: "cancelled" })
    .eq("id", event_id)
    .select()
    .single();

  if (updateError) {
    console.error("[mtgx-api] Error:", updateError.message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  // Notify all going/maybe participants
  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("user_id")
    .eq("event_id", event_id)
    .in("status", ["going", "maybe", "waitlisted"]);

  if (rsvps && rsvps.length > 0) {
    const recipientIds = rsvps.map((r: { user_id: string }) => r.user_id);

    await supabase.from("notification_outbox").insert({
      event_id,
      type: "event_cancelled",
      payload: {
        event_id,
        title: event.title,
        recipients: recipientIds,
      },
    });
  }

  return jsonResponse({ event: updated });
}

// LFG signal handler
async function handleLfg(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const bodyOrError = await parseRequestBody(req);
  if (bodyOrError instanceof Response) return bodyOrError;
  const body = bodyOrError;
  const { city, formats } = body as { city?: string; formats?: string[] };

  if (!city || !formats || !Array.isArray(formats) || formats.length === 0) {
    return jsonResponse({ error: "city and formats are required" }, 400);
  }

  // Validate all formats are valid MTG format values
  const invalidFormats = formats.filter((f) => !VALID_FORMATS.includes(f as typeof VALID_FORMATS[number]));
  if (invalidFormats.length > 0) {
    return jsonResponse({ error: `Invalid formats: ${invalidFormats.join(", ")}. Must be one of: ${VALID_FORMATS.join(", ")}` }, 400);
  }

  const expiresAt = new Date(Date.now() + HOURS_24_MS).toISOString();

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
    console.error("[mtgx-api] Error:", error.message);
    return jsonResponse({ error: "Internal server error" }, 500);
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

  const bodyOrError = await parseRequestBody(req);
  if (bodyOrError instanceof Response) return bodyOrError;
  const body = bodyOrError;
  const { user_id, role, venue_id } = body as { user_id?: string; role?: string; venue_id?: string };

  if (!user_id || !role) {
    return jsonResponse({ error: "user_id and role are required" }, 400);
  }

  if (!["player", "organizer", "club_owner", "admin"].includes(role)) {
    return jsonResponse({ error: "Invalid role" }, 400);
  }

  if (role === "club_owner" && !venue_id) {
    return jsonResponse({ error: "venue_id is required for club_owner role" }, 400);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user_id)
    .select()
    .single();

  if (error) {
    console.error("[mtgx-api] Error:", error.message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  // Assign venue ownership when setting club_owner role
  if (role === "club_owner" && venue_id) {
    const { error: venueError } = await supabase
      .from("venues")
      .update({ owner_id: user_id })
      .eq("id", venue_id);

    if (venueError) {
      console.error("[mtgx-api] Error assigning venue:", venueError.message);
      return jsonResponse({ error: "Role updated but venue assignment failed" }, 500);
    }
  }

  return jsonResponse({ profile });
}

// Admin stats dashboard
async function handleAdminStats(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Verify admin
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!adminProfile || adminProfile.role !== "admin") {
    return jsonResponse({ error: "Admin access required" }, 403);
  }

  const now = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // --- TODAY zone: alerts ---

  // Inactive organizers (had events in past 90d, none in last 14d)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: activeOrganizers } = await supabase
    .from("events")
    .select("organizer_id")
    .gte("created_at", ninetyDaysAgo)
    .lte("created_at", fourteenDaysAgo);

  const { data: recentOrganizers } = await supabase
    .from("events")
    .select("organizer_id")
    .gte("created_at", fourteenDaysAgo);

  const recentOrgIds = new Set((recentOrganizers || []).map((e: { organizer_id: string }) => e.organizer_id));
  const inactiveOrgIds = [...new Set((activeOrganizers || []).map((e: { organizer_id: string }) => e.organizer_id))]
    .filter(id => !recentOrgIds.has(id));

  // Get inactive organizer profiles
  let inactiveOrganizers: { id: string; display_name: string }[] = [];
  if (inactiveOrgIds.length > 0) {
    const { data: orgProfiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", inactiveOrgIds.slice(0, 10));
    inactiveOrganizers = orgProfiles || [];
  }

  // Stale LFG signals (posted > 48h ago, still active)
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { count: staleLfg } = await supabase
    .from("looking_for_game")
    .select("*", { count: "exact", head: true })
    .lt("created_at", fortyEightHoursAgo)
    .gt("expires_at", now);

  // --- THIS WEEK zone: core metrics ---

  // Total users
  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  // New users this week
  const { count: newUsersThisWeek } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo);

  // New users previous week (for delta)
  const { count: newUsersPrevWeek } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", fourteenDaysAgo)
    .lt("created_at", sevenDaysAgo);

  // Activation rate this week (users with first_rsvp_date within 7d of created_at)
  const { data: recentProfiles } = await supabase
    .from("profiles")
    .select("id, created_at, first_rsvp_date")
    .gte("created_at", thirtyDaysAgo);

  let activatedCount = 0;
  let eligibleCount = 0;
  if (recentProfiles) {
    for (const p of recentProfiles) {
      const createdAt = new Date(p.created_at).getTime();
      const sevenDaysAfter = createdAt + 7 * 24 * 60 * 60 * 1000;
      if (sevenDaysAfter < Date.now()) {
        eligibleCount++;
        if (p.first_rsvp_date) {
          const firstRsvp = new Date(p.first_rsvp_date).getTime();
          if (firstRsvp <= sevenDaysAfter) {
            activatedCount++;
          }
        }
      }
    }
  }
  const activationRate = eligibleCount > 0 ? Math.round((activatedCount / eligibleCount) * 100) : 0;

  // Events this week
  const { count: eventsThisWeek } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo);

  // RSVPs this week
  const { count: rsvpsThisWeek } = await supabase
    .from("rsvps")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo);

  // LFG conversion (LFG posted this month -> had RSVP within 72h)
  const { data: recentLfg } = await supabase
    .from("looking_for_game")
    .select("user_id, created_at")
    .gte("created_at", thirtyDaysAgo);

  let lfgWithRsvp = 0;
  if (recentLfg && recentLfg.length > 0) {
    for (const lfg of recentLfg) {
      const lfgTime = new Date(lfg.created_at).getTime();
      const { count: rsvpAfter } = await supabase
        .from("rsvps")
        .select("*", { count: "exact", head: true })
        .eq("user_id", lfg.user_id)
        .gte("created_at", lfg.created_at)
        .lte("created_at", new Date(lfgTime + 72 * 60 * 60 * 1000).toISOString());
      if (rsvpAfter && rsvpAfter > 0) lfgWithRsvp++;
    }
  }
  const lfgConversionRate = recentLfg && recentLfg.length > 0
    ? Math.round((lfgWithRsvp / recentLfg.length) * 100)
    : 0;

  // Silent exit count
  // Users with >=1 RSVP ever but no RSVP in last 30 days
  const { data: allRsvpUsers } = await supabase
    .from("rsvps")
    .select("user_id")
    .in("status", ["going", "maybe"]);

  const allRsvpUserIds = [...new Set((allRsvpUsers || []).map((r: { user_id: string }) => r.user_id))];

  const { data: recentRsvpUsers } = await supabase
    .from("rsvps")
    .select("user_id")
    .gte("created_at", thirtyDaysAgo)
    .in("status", ["going", "maybe"]);

  const recentRsvpUserIds = new Set((recentRsvpUsers || []).map((r: { user_id: string }) => r.user_id));
  const silentExitCount = allRsvpUserIds.filter(id => !recentRsvpUserIds.has(id)).length;

  // Active LFG right now
  const { count: activeLfg } = await supabase
    .from("looking_for_game")
    .select("*", { count: "exact", head: true })
    .gt("expires_at", now);

  // --- TRENDS zone: daily_stats for sparklines ---
  const { data: dailyStats } = await supabase
    .from("daily_stats")
    .select("*")
    .gte("stat_date", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .order("stat_date", { ascending: true });

  const response = {
    computed_at: now,
    today: {
      inactive_organizers: inactiveOrganizers,
      stale_lfg_count: staleLfg || 0,
      active_lfg: activeLfg || 0,
    },
    this_week: {
      total_users: totalUsers || 0,
      new_users: newUsersThisWeek || 0,
      new_users_prev_week: newUsersPrevWeek || 0,
      activation_rate: activationRate,
      events_created: eventsThisWeek || 0,
      rsvps: rsvpsThisWeek || 0,
      lfg_conversion_rate: lfgConversionRate,
      silent_exit_count: silentExitCount,
    },
    trends: dailyStats || [],
  };

  return jsonResponse(response);
}

// Admin users list with emails
async function handleAdminUsers(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!adminProfile || adminProfile.role !== "admin") {
    return jsonResponse({ error: "Admin access required" }, 403);
  }

  // Get profiles with whatsapp
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, city, role, reliability_score, formats, whatsapp, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (profilesError) {
    console.error("[mtgx-api] Error:", profilesError.message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  // Get auth users to extract emails
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });

  if (authError) {
    console.error("[mtgx-api] Auth error:", authError.message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  const emailMap = new Map<string, string>();
  for (const u of authData.users) {
    if (u.email) emailMap.set(u.id, u.email);
  }

  const users = (profiles || []).map((p: Record<string, unknown>) => ({
    ...p,
    email: emailMap.get(p.id as string) || null,
  }));

  return jsonResponse({ users });
}

// Send invite to a player
async function handleSendInvite(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const bodyOrError = await parseRequestBody(req);
  if (bodyOrError instanceof Response) return bodyOrError;
  const body = bodyOrError;
  const { to_user_id, event_id, format, message, proposed_time } = body as Record<string, unknown>;

  if (!to_user_id) {
    return jsonResponse({ error: "to_user_id is required" }, 400);
  }

  if (to_user_id === userId) {
    return jsonResponse({ error: "Cannot invite yourself" }, 400);
  }

  if (message && typeof message === "string" && message.length > MAX_INVITE_MESSAGE_LEN) {
    return jsonResponse({ error: `Message must be ${MAX_INVITE_MESSAGE_LEN} characters or less` }, 400);
  }

  // Check recipient's invite preferences
  const { data: prefs } = await supabase
    .from("invite_preferences")
    .select("is_open, dnd_until, visibility")
    .eq("user_id", to_user_id)
    .maybeSingle();

  if (prefs) {
    if (!prefs.is_open) {
      return jsonResponse({ error: "Cannot send invite at this time" }, 403);
    }
    if (prefs.dnd_until && new Date(prefs.dnd_until) > new Date()) {
      return jsonResponse({ error: "Cannot send invite at this time" }, 403);
    }
    // Visibility check
    if (prefs.visibility === "none") {
      return jsonResponse({ error: "Cannot send invite at this time" }, 403);
    }
    if (prefs.visibility === "played_together") {
      const { data: played } = await supabase.rpc("check_played_together", {
        p_user1: userId,
        p_user2: to_user_id,
      }).maybeSingle();
      // Fallback: check directly
      if (!played) {
        const { data: directCheck } = await supabase
          .from("rsvps")
          .select("event_id")
          .eq("user_id", userId)
          .eq("status", "going")
          .limit(100);

        if (directCheck) {
          const eventIds = directCheck.map((r: { event_id: string }) => r.event_id);
          if (eventIds.length > 0) {
            const { count } = await supabase
              .from("rsvps")
              .select("*", { count: "exact", head: true })
              .eq("user_id", to_user_id as string)
              .eq("status", "going")
              .in("event_id", eventIds);

            if (!count || count === 0) {
              return jsonResponse({ error: "Cannot send invite at this time" }, 403);
            }
          } else {
            return jsonResponse({ error: "Cannot send invite at this time" }, 403);
          }
        }
      }
    }
  }

  // Rate limit: organizers skip limit for their own events
  let skipRateLimit = false;
  if (event_id) {
    const { data: event } = await supabase
      .from("events")
      .select("organizer_id")
      .eq("id", event_id)
      .single();
    skipRateLimit = !!event && event.organizer_id === userId;
  }

  if (!skipRateLimit && await checkDailyInviteLimit(supabase, userId)) {
    return jsonResponse({ error: `Daily invite limit reached (${DAILY_INVITE_LIMIT} per day)` }, 429);
  }

  // Create invite
  const { data: invite, error } = await supabase
    .from("player_invites")
    .insert({
      from_user_id: userId,
      to_user_id,
      event_id: event_id || null,
      format: format || null,
      message: message || null,
      proposed_time: proposed_time || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonResponse({ error: "Invite already sent" }, 409);
    }
    console.error("[mtgx-api] Error:", error.message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  // Get sender name for notification
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single();

  // Create in-app notification
  await supabase.from("notifications").insert({
    user_id: to_user_id as string,
    event_id: (event_id as string) || null,
    type: "player_invite",
    title: `Invite from ${senderProfile?.display_name ?? "Someone"}`,
    body: (message as string) || "You've been invited to play!",
  });

  // Create outbox for push
  await supabase.from("notification_outbox").insert({
    event_id: (event_id as string) || null,
    type: "player_invite",
    payload: {
      from_user_id: userId,
      to_user_id,
      event_id: event_id || null,
      message: message || "",
      recipients: [to_user_id],
    },
  });

  return jsonResponse({ invite }, 201);
}

// Respond to invite (accept/decline)
async function handleRespondInvite(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const bodyOrError = await parseRequestBody(req);
  if (bodyOrError instanceof Response) return bodyOrError;
  const body = bodyOrError;
  const { invite_id, status } = body as { invite_id?: number; status?: string };

  if (!invite_id || !status) {
    return jsonResponse({ error: "invite_id and status are required" }, 400);
  }

  if (!["accepted", "declined"].includes(status)) {
    return jsonResponse({ error: "Status must be 'accepted' or 'declined'" }, 400);
  }

  // Get invite
  const { data: invite, error: getError } = await supabase
    .from("player_invites")
    .select("*")
    .eq("id", invite_id)
    .single();

  if (getError || !invite) {
    return jsonResponse({ error: "Invite not found" }, 404);
  }

  if (invite.to_user_id !== userId) {
    return jsonResponse({ error: "Only the recipient can respond" }, 403);
  }

  if (invite.status !== "pending") {
    return jsonResponse({ error: "Invite is no longer pending" }, 400);
  }

  // Update invite status
  const { data: updated, error: updateError } = await supabase
    .from("player_invites")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", invite_id)
    .select()
    .single();

  if (updateError) {
    console.error("[mtgx-api] Error:", updateError.message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  // If accepted and has event_id, auto-RSVP via rsvp_with_lock to respect capacity limits
  if (status === "accepted" && invite.event_id) {
    const { error: rsvpError } = await supabase.rpc("rsvp_with_lock", {
      p_event_id: invite.event_id,
      p_user_id: userId,
      p_status: "going",
      p_power_level: null,
    });

    if (rsvpError) {
      // If the event is full, the player gets waitlisted — log but don't fail the invite response
      console.error("Auto-RSVP on invite accept failed:", rsvpError.message);
    }
  }

  // If accepted, notify sender
  if (status === "accepted") {
    const { data: responderProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    await supabase.from("notifications").insert({
      user_id: invite.from_user_id,
      event_id: invite.event_id,
      type: "invite_accepted",
      title: "Invite accepted!",
      body: `${responderProfile?.display_name ?? "Someone"} accepted your invitation`,
    });

    await supabase.from("notification_outbox").insert({
      event_id: invite.event_id,
      type: "invite_accepted",
      payload: {
        from_user_id: invite.from_user_id,
        to_user_id: userId,
        event_id: invite.event_id,
        recipients: [invite.from_user_id],
      },
    });
  }

  return jsonResponse({ invite: updated });
}

// Get invites (incoming or outgoing)
async function handleGetInvites(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const url = new URL(req.url);
  const direction = url.searchParams.get("direction") || "incoming";
  const statusFilter = url.searchParams.get("status");

  let query;
  if (direction === "outgoing") {
    query = supabase
      .from("player_invites")
      .select("*, profiles!player_invites_to_user_id_fkey(display_name, avatar_url), events(id, title, format, starts_at)")
      .eq("from_user_id", userId);
  } else {
    query = supabase
      .from("player_invites")
      .select("*, profiles!player_invites_from_user_id_fkey(display_name, avatar_url), events(id, title, format, starts_at)")
      .eq("to_user_id", userId);
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(50);

  if (error) {
    console.error("[mtgx-api] Error:", error.message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  return jsonResponse({ invites: data });
}

// Organizer sends message to event participants
async function handleEventMessage(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const bodyOrError = await parseRequestBody(req);
  if (bodyOrError instanceof Response) return bodyOrError;
  const body = bodyOrError;
  const { event_id, message } = body as { event_id?: string; message?: string };

  if (!event_id || !message) {
    return jsonResponse({ error: "event_id and message are required" }, 400);
  }

  if (message.length > MAX_EVENT_MESSAGE_LEN) {
    return jsonResponse({ error: `Message must be ${MAX_EVENT_MESSAGE_LEN} characters or less` }, 400);
  }

  // Verify user is the organizer of this event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, organizer_id, title")
    .eq("id", event_id)
    .single();

  if (eventError || !event) {
    return jsonResponse({ error: "Event not found" }, 404);
  }

  if (event.organizer_id !== userId) {
    return jsonResponse({ error: "Only the event organizer can send messages" }, 403);
  }

  // Create organizer message
  const { data: msg, error: msgError } = await supabase
    .from("organizer_messages")
    .insert({
      event_id,
      organizer_id: userId,
      body: message,
    })
    .select()
    .single();

  if (msgError) {
    console.error("[mtgx-api] Error:", msgError.message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  // Get all going/maybe participants
  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("user_id")
    .eq("event_id", event_id)
    .in("status", ["going", "maybe"]);

  if (rsvps && rsvps.length > 0) {
    const recipientIds = rsvps.map((r: { user_id: string }) => r.user_id);

    // Create outbox entry for push notifications
    await supabase.from("notification_outbox").insert({
      event_id,
      type: "organizer_message",
      payload: {
        event_id,
        organizer_id: userId,
        message,
        title: event.title,
        recipients: recipientIds,
      },
    });
  }

  return jsonResponse({ message: msg }, 201);
}

// Player confirms attendance
async function handleConfirmAttendance(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const bodyOrError = await parseRequestBody(req);
  if (bodyOrError instanceof Response) return bodyOrError;
  const body = bodyOrError;
  const { event_id } = body as { event_id?: string };

  if (!event_id) {
    return jsonResponse({ error: "event_id is required" }, 400);
  }

  // Verify user has RSVP for this event
  const { data: rsvp, error: rsvpError } = await supabase
    .from("rsvps")
    .select("id, status")
    .eq("event_id", event_id)
    .eq("user_id", userId)
    .single();

  if (rsvpError || !rsvp) {
    return jsonResponse({ error: "RSVP not found" }, 404);
  }

  if (rsvp.status !== "going") {
    return jsonResponse({ error: "Only 'going' RSVPs can be confirmed" }, 400);
  }

  // Update RSVP confirmed_at timestamp
  const { data: updated, error: updateError } = await supabase
    .from("rsvps")
    .update({
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Record<string, string>)
    .eq("id", rsvp.id)
    .select()
    .single();

  if (updateError) {
    console.error("[mtgx-api] Error:", updateError.message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  // Bump reliability score slightly (max 1.0)
  await supabase.rpc("increment_reliability_score", {
    p_user_id: userId,
    p_delta: 0.01,
  }).maybeSingle();

  return jsonResponse({ rsvp: updated });
}

// Submit feedback report
async function handleFeedback(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const bodyOrError = await parseRequestBody(req);
  if (bodyOrError instanceof Response) return bodyOrError;
  const body = bodyOrError;
  const { type, message, screenshot_url, page_url, user_agent, app_version } = body as Record<string, unknown>;

  if (!type || !message) {
    return jsonResponse({ error: "type and message are required" }, 400);
  }

  if (!["bug", "suggestion", "question"].includes(type as string)) {
    return jsonResponse({ error: "type must be 'bug', 'suggestion', or 'question'" }, 400);
  }

  if (typeof message === "string" && message.length > MAX_FEEDBACK_BODY_LEN) {
    return jsonResponse({ error: `Message must be ${MAX_FEEDBACK_BODY_LEN} characters or less` }, 400);
  }

  const { data: report, error } = await supabase
    .from("feedback_reports")
    .insert({
      user_id: userId,
      type,
      body: message,
      screenshot_url: screenshot_url || null,
      page_url: page_url || null,
      user_agent: user_agent || null,
      app_version: app_version || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[mtgx-api] Error:", error.message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  return jsonResponse({ report }, 201);
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
