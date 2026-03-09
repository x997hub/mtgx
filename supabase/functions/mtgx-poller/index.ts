import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HOURS_24_MS = 24 * 60 * 60 * 1000;
const DAILY_REPORT_HOUR = 8;
const OUTBOX_BATCH_LIMIT = 50;

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "*";
if (allowedOrigin === "*") {
  console.warn("[mtgx-poller] ALLOWED_ORIGIN not set — CORS is open to all origins. Set ALLOWED_ORIGIN env var in production.");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Authenticate: poller should only be called by Supabase cron (service role key)
  // or with a shared secret. If CRON_SECRET is set, require it in the Authorization header.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const results: Record<string, unknown> = {
    outbox_processed: 0,
    expired_events: 0,
    expired_lfg: 0,
    reminders_sent: 0,
    min_reached: 0,
    daily_report: false,
    expired_invites: 0,
    confirmation_reminders_sent: 0,
    players_recruited: 0,
    recurring_events_generated: 0,
  };

  try {
    // 1. Process notification outbox (pending, attempts < 3)
    results.outbox_processed = await processOutbox(supabase);

    // 2. Expire quick meetups
    results.expired_events = await expireQuickMeetups(supabase);

    // 3. Expire LFG signals
    results.expired_lfg = await expireLfgSignals(supabase);

    // 4. Send reminders (24h before event)
    results.reminders_sent = await sendReminders(supabase);

    // 5. Check min_players reached
    results.min_reached = await checkMinPlayers(supabase);

    // 6. Generate daily report at 08:00
    results.daily_report = await maybeGenerateDailyReport(supabase);

    // 7. Expire pending invites (24h)
    results.expired_invites = await expireInvites(supabase);

    // 8. Send confirmation reminders (24h and 3h before event)
    results.confirmation_reminders_sent = await sendConfirmationReminders(supabase);

    // 9. Recruit players for events with low capacity
    results.players_recruited = await recruitPlayers(supabase);

    // 10. Generate recurring events from templates
    results.recurring_events_generated = await generateRecurringEvents(supabase);
  } catch (err) {
    console.error("Poller error:", err);
  }

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function processOutbox(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data: entries, error } = await supabase
    .from("notification_outbox")
    .select("*")
    .eq("status", "pending")
    .lt("attempts", 3)
    .order("created_at", { ascending: true })
    .limit(OUTBOX_BATCH_LIMIT);

  if (error || !entries || entries.length === 0) return 0;

  let processed = 0;

  for (const entry of entries) {
    try {
      // Determine recipients based on entry type
      const recipients = await getRecipients(supabase, entry);

      for (const userId of recipients) {
        // Check dedup: skip if already notified for this event
        if (entry.event_id) {
          const { data: existing } = await supabase
            .from("notification_sent")
            .select("user_id")
            .eq("user_id", userId)
            .eq("event_id", entry.event_id)
            .maybeSingle();

          if (existing) continue;
        }

        // Create in-app notification
        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: userId,
          event_id: entry.event_id,
          type: entry.type,
          title: getNotificationTitle(entry.type),
          body: getNotificationBody(entry),
        });

        if (notifError) {
          console.error(`Failed to insert notification for user ${userId}, entry ${entry.id}:`, notifError);
          // Don't mark as sent — skip this entry and let it retry
          throw new Error(`Notification insert failed: ${notifError.message}`);
        }

        // Record dedup
        if (entry.event_id) {
          await supabase.from("notification_sent").upsert({
            user_id: userId,
            event_id: entry.event_id,
            reason: entry.type,
          });
        }

        // Send Web Push
        await sendWebPush(supabase, userId, entry);
      }

      // Mark as sent
      await supabase
        .from("notification_outbox")
        .update({ status: "sent", last_attempt_at: new Date().toISOString() })
        .eq("id", entry.id);

      processed++;
    } catch (err) {
      console.error(`Failed to process outbox entry ${entry.id}:`, err);

      // Increment attempts — wrap in its own try-catch to prevent silent failures
      try {
        const newAttempts = entry.attempts + 1;
        await supabase
          .from("notification_outbox")
          .update({
            attempts: newAttempts,
            status: newAttempts >= 3 ? "dead" : "pending",
            last_attempt_at: new Date().toISOString(),
          })
          .eq("id", entry.id);
      } catch (updateErr) {
        console.error(`Failed to update attempts for outbox entry ${entry.id}:`, updateErr);
      }
    }
  }

  return processed;
}

async function getRecipients(
  supabase: ReturnType<typeof createClient>,
  entry: Record<string, unknown>,
): Promise<string[]> {
  const payload = entry.payload as Record<string, unknown>;
  const recipientSet = new Set<string>();

  if (entry.type === "new_event" && entry.event_id) {
    // Direct subscribers (organizer or venue)
    const organizerId = payload.organizer_id as string;
    const venueId = payload.venue_id as string;

    // Subscribers to the organizer
    const { data: orgSubs } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("target_type", "organizer")
      .eq("target_id", organizerId);

    orgSubs?.forEach((s: { user_id: string }) => recipientSet.add(s.user_id));

    // Subscribers to the venue
    if (venueId) {
      const { data: venueSubs } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("target_type", "venue")
        .eq("target_id", venueId);

      venueSubs?.forEach((s: { user_id: string }) => recipientSet.add(s.user_id));
    }

    // Format+city subscribers with availability match
    const format = payload.format as string;
    const city = payload.city as string;

    const { data: formatCitySubs } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("target_type", "format_city")
      .eq("format", format)
      .eq("city", city);

    if (formatCitySubs) {
      // For format_city subs, check availability match
      const { data: matched } = await supabase.rpc("availability_match", {
        p_event_id: entry.event_id,
      });

      const matchedIds = new Set((matched || []).map((m: { user_id: string }) => m.user_id));

      formatCitySubs.forEach((s: { user_id: string }) => {
        if (matchedIds.has(s.user_id)) {
          recipientSet.add(s.user_id);
        }
      });
    }

    // Remove the organizer from recipients
    recipientSet.delete(organizerId);
  }

  // Player invite, invite accepted, auto_match, organizer_message, attendance_confirmation,
  // player_recruitment, rsvp_waitlisted: recipients from payload
  if (
    entry.type === "player_invite" ||
    entry.type === "invite_accepted" ||
    entry.type === "auto_match" ||
    entry.type === "organizer_message" ||
    entry.type === "attendance_confirmation" ||
    entry.type === "player_recruitment" ||
    entry.type === "rsvp_waitlisted" ||
    entry.type === "waitlist_promoted"
  ) {
    const payloadRecipients = payload.recipients as string[] | undefined;
    if (payloadRecipients) {
      payloadRecipients.forEach((id: string) => recipientSet.add(id));
    }
  }

  return Array.from(recipientSet);
}

async function expireQuickMeetups(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data, error } = await supabase
    .from("events")
    .update({ status: "expired" })
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("Error expiring events:", error);
    return 0;
  }

  return data?.length || 0;
}

async function expireLfgSignals(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data, error } = await supabase
    .from("looking_for_game")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("Error expiring LFG:", error);
    return 0;
  }

  return data?.length || 0;
}

async function sendReminders(supabase: ReturnType<typeof createClient>): Promise<number> {
  const now = new Date();
  const in24h = new Date(now.getTime() + HOURS_24_MS);
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);

  // Find events starting between 23h and 24h from now
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, format, city, starts_at")
    .eq("status", "active")
    .gte("starts_at", in23h.toISOString())
    .lte("starts_at", in24h.toISOString());

  if (error || !events || events.length === 0) return 0;

  let sent = 0;

  for (const event of events) {
    // Get all going/maybe RSVPs
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("user_id")
      .eq("event_id", event.id)
      .in("status", ["going", "maybe"]);

    if (!rsvps) continue;

    // Write outbox entry for reminder
    await supabase.from("notification_outbox").insert({
      event_id: event.id,
      type: "reminder",
      payload: {
        event_id: event.id,
        title: event.title,
        starts_at: event.starts_at,
        recipients: rsvps.map((r: { user_id: string }) => r.user_id),
      },
    });

    sent += rsvps.length;
  }

  return sent;
}

async function checkMinPlayers(supabase: ReturnType<typeof createClient>): Promise<number> {
  // Find active events that just reached min_players
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, min_players, organizer_id, starts_at")
    .eq("status", "active")
    .gt("starts_at", new Date().toISOString());

  if (error || !events) return 0;

  let reached = 0;

  for (const event of events) {
    const { count } = await supabase
      .from("rsvps")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("status", "going");

    if (count !== null && count >= (event.min_players || 2)) {
      // Check if we already sent min_reached notification
      const { data: existing } = await supabase
        .from("notification_outbox")
        .select("id")
        .eq("event_id", event.id)
        .eq("type", "min_reached")
        .maybeSingle();

      if (!existing) {
        await supabase.from("notification_outbox").insert({
          event_id: event.id,
          type: "min_reached",
          payload: {
            event_id: event.id,
            title: event.title,
            going_count: count,
            min_players: event.min_players,
          },
        });
        reached++;
      }
    }
  }

  return reached;
}

async function maybeGenerateDailyReport(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const now = new Date();
  const hour = now.getUTCHours();

  // Only generate at ~08:00 UTC (approximate, since poller runs every minute)
  if (hour !== DAILY_REPORT_HOUR) return false;

  const today = now.toISOString().split("T")[0];

  // Check if report already exists for today
  const { data: existing } = await supabase
    .from("admin_reports")
    .select("id")
    .eq("report_date", today)
    .maybeSingle();

  if (existing) return false;

  const yesterday = new Date(now.getTime() - HOURS_24_MS).toISOString();

  // Gather stats
  const { count: newUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", yesterday);

  const { data: eventCounts } = await supabase
    .from("events")
    .select("type")
    .gte("created_at", yesterday);

  const bigEvents = eventCounts?.filter((e: { type: string }) => e.type === "big").length || 0;
  const quickEvents = eventCounts?.filter((e: { type: string }) => e.type === "quick").length || 0;

  const { data: rsvpCounts } = await supabase
    .from("rsvps")
    .select("status")
    .gte("created_at", yesterday);

  const goingCount = rsvpCounts?.filter((r: { status: string }) => r.status === "going").length || 0;
  const maybeCount = rsvpCounts?.filter((r: { status: string }) => r.status === "maybe").length || 0;
  const notGoingCount = rsvpCounts?.filter((r: { status: string }) => r.status === "not_going").length || 0;

  const { count: lfgSignals } = await supabase
    .from("looking_for_game")
    .select("*", { count: "exact", head: true })
    .gte("created_at", yesterday);

  const { count: activeLfg } = await supabase
    .from("looking_for_game")
    .select("*", { count: "exact", head: true })
    .gt("expires_at", now.toISOString());

  const { data: lowReliability } = await supabase
    .from("profiles")
    .select("id, display_name, reliability_score")
    .lt("reliability_score", 0.5)
    .order("reliability_score", { ascending: true })
    .limit(10);

  const payload = {
    date: today,
    new_users: newUsers || 0,
    events_created: { big: bigEvents, quick: quickEvents },
    rsvps_today: { going: goingCount, maybe: maybeCount, not_going: notGoingCount },
    lfg_signals: lfgSignals || 0,
    active_lfg_now: activeLfg || 0,
    low_reliability_users: lowReliability || [],
  };

  await supabase.from("admin_reports").insert({
    report_date: today,
    payload,
  });

  return true;
}

async function expireInvites(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data, error } = await supabase
    .from("player_invites")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("created_at", new Date(Date.now() - HOURS_24_MS).toISOString())
    .select("id");

  if (error) {
    console.error("Error expiring invites:", error);
    return 0;
  }

  return data?.length || 0;
}

// Send confirmation reminders 24h and 3h before events
async function sendConfirmationReminders(supabase: ReturnType<typeof createClient>): Promise<number> {
  const now = new Date();
  let sent = 0;

  // 24h window: events starting between 23h and 25h from now
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: events24h } = await supabase
    .from("events")
    .select("id, title, starts_at, confirmation_sent_24h")
    .eq("status", "active")
    .gte("starts_at", in23h.toISOString())
    .lte("starts_at", in25h.toISOString())
    .or("confirmation_sent_24h.is.null,confirmation_sent_24h.eq.false");

  if (events24h) {
    for (const event of events24h) {
      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("user_id")
        .eq("event_id", event.id)
        .eq("status", "going");

      if (!rsvps || rsvps.length === 0) continue;

      await supabase.from("notification_outbox").insert({
        event_id: event.id,
        type: "attendance_confirmation",
        payload: {
          event_id: event.id,
          title: event.title,
          starts_at: event.starts_at,
          window: "24h",
          recipients: rsvps.map((r: { user_id: string }) => r.user_id),
        },
      });

      await supabase
        .from("events")
        .update({ confirmation_sent_24h: true })
        .eq("id", event.id);

      sent += rsvps.length;
    }
  }

  // 3h window: events starting between 2.5h and 3.5h from now
  const in2_5h = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
  const in3_5h = new Date(now.getTime() + 3.5 * 60 * 60 * 1000);

  const { data: events3h } = await supabase
    .from("events")
    .select("id, title, starts_at, confirmation_sent_3h")
    .eq("status", "active")
    .gte("starts_at", in2_5h.toISOString())
    .lte("starts_at", in3_5h.toISOString())
    .or("confirmation_sent_3h.is.null,confirmation_sent_3h.eq.false");

  if (events3h) {
    for (const event of events3h) {
      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("user_id")
        .eq("event_id", event.id)
        .eq("status", "going");

      if (!rsvps || rsvps.length === 0) continue;

      await supabase.from("notification_outbox").insert({
        event_id: event.id,
        type: "attendance_confirmation",
        payload: {
          event_id: event.id,
          title: event.title,
          starts_at: event.starts_at,
          window: "3h",
          recipients: rsvps.map((r: { user_id: string }) => r.user_id),
        },
      });

      await supabase
        .from("events")
        .update({ confirmation_sent_3h: true })
        .eq("id", event.id);

      sent += rsvps.length;
    }
  }

  return sent;
}

// Recruit players for events starting soon with low capacity
async function recruitPlayers(supabase: ReturnType<typeof createClient>): Promise<number> {
  const now = new Date();
  const in24h = new Date(now.getTime() + HOURS_24_MS);
  const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  // Find events starting in 24-72h
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, format, city, max_players, starts_at")
    .eq("status", "active")
    .not("max_players", "is", null)
    .gte("starts_at", in24h.toISOString())
    .lte("starts_at", in72h.toISOString());

  if (error || !events || events.length === 0) return 0;

  let recruited = 0;

  for (const event of events) {
    // Count current going RSVPs
    const { count: goingCount } = await supabase
      .from("rsvps")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("status", "going");

    const capacityRemaining = (event.max_players || 0) - (goingCount || 0);

    // Only recruit if 1-2 spots remaining
    if (capacityRemaining < 1 || capacityRemaining > 2) continue;

    // Check if we already sent a recruitment for this event
    const { data: existingRecruitment } = await supabase
      .from("notification_outbox")
      .select("id")
      .eq("event_id", event.id)
      .eq("type", "player_recruitment")
      .maybeSingle();

    if (existingRecruitment) continue;

    // Find matching players via auto_match_preferences
    const { data: matchingPlayers } = await supabase
      .from("auto_match_preferences")
      .select("user_id")
      .eq("is_active", true)
      .contains("formats", [event.format]);

    if (!matchingPlayers || matchingPlayers.length === 0) continue;

    // Filter out players already RSVP'd
    const { data: existingRsvps } = await supabase
      .from("rsvps")
      .select("user_id")
      .eq("event_id", event.id);

    const existingUserIds = new Set(
      (existingRsvps || []).map((r: { user_id: string }) => r.user_id),
    );

    const eligiblePlayers = matchingPlayers
      .filter((p: { user_id: string }) => !existingUserIds.has(p.user_id))
      .map((p: { user_id: string }) => p.user_id);

    if (eligiblePlayers.length === 0) continue;

    // Limit to reasonable number of recruitment notifications
    const recruitmentTargets = eligiblePlayers.slice(0, 10);

    await supabase.from("notification_outbox").insert({
      event_id: event.id,
      type: "player_recruitment",
      payload: {
        event_id: event.id,
        title: event.title,
        format: event.format,
        city: event.city,
        starts_at: event.starts_at,
        spots_remaining: capacityRemaining,
        recipients: recruitmentTargets,
      },
    });

    recruited += recruitmentTargets.length;
  }

  return recruited;
}

// Generate recurring events from active templates
async function generateRecurringEvents(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data: templates, error } = await supabase
    .from("event_templates")
    .select("*")
    .eq("is_active", true);

  if (error || !templates || templates.length === 0) return 0;

  let generated = 0;
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * HOURS_24_MS); // 14 days ahead

  for (const template of templates) {
    const templateData = template.template_data as Record<string, unknown>;
    const rule = template.recurrence_rule as string;

    // Parse simple RRULE patterns: FREQ=WEEKLY;BYDAY=MO,TH etc.
    const dates = generateDatesFromRRule(rule, now, horizon);

    for (const date of dates) {
      const startsAt = date.toISOString();

      // Check if event already exists for this template + date
      const { data: existing } = await supabase
        .from("events")
        .select("id")
        .eq("template_id", template.id)
        .eq("starts_at", startsAt)
        .maybeSingle();

      if (existing) continue;

      // Create event from template
      const { error: insertError } = await supabase.from("events").insert({
        organizer_id: template.organizer_id,
        venue_id: template.venue_id || null,
        template_id: template.id,
        type: (templateData.type as string) || "big",
        title: (templateData.title as string) || null,
        format: templateData.format as string,
        city: templateData.city as string,
        starts_at: startsAt,
        duration_min: (templateData.duration_min as number) || null,
        min_players: (templateData.min_players as number) || 2,
        max_players: (templateData.max_players as number) || null,
        fee_text: (templateData.fee_text as string) || null,
        description: (templateData.description as string) || null,
      });

      if (insertError) {
        console.error(`Failed to generate recurring event from template ${template.id}:`, insertError);
        continue;
      }

      generated++;
    }

    // Update last_generated_at
    await supabase
      .from("event_templates")
      .update({ last_generated_at: now.toISOString() })
      .eq("id", template.id);
  }

  return generated;
}

// Parse simple RRULE and generate dates within a window
function generateDatesFromRRule(rule: string, from: Date, to: Date): Date[] {
  const dates: Date[] = [];

  // Parse RRULE parts
  const parts: Record<string, string> = {};
  rule.split(";").forEach((part) => {
    const [key, value] = part.split("=");
    if (key && value) parts[key] = value;
  });

  const freq = parts["FREQ"];
  const byDay = parts["BYDAY"]?.split(",") || [];

  const dayMap: Record<string, number> = {
    SU: 0,
    MO: 1,
    TU: 2,
    WE: 3,
    TH: 4,
    FR: 5,
    SA: 6,
  };

  if (freq === "WEEKLY" && byDay.length > 0) {
    const targetDays = byDay
      .map((d) => dayMap[d])
      .filter((d) => d !== undefined);

    // Walk day by day from `from` to `to`
    const current = new Date(from);
    current.setHours(0, 0, 0, 0);

    while (current <= to) {
      if (targetDays.includes(current.getDay())) {
        // Use a fixed time (e.g. from template or default 19:00)
        const eventDate = new Date(current);
        eventDate.setHours(19, 0, 0, 0);
        if (eventDate > from) {
          dates.push(new Date(eventDate));
        }
      }
      current.setDate(current.getDate() + 1);
    }
  } else if (freq === "DAILY") {
    const interval = parseInt(parts["INTERVAL"] || "1", 10);
    const current = new Date(from);
    current.setHours(19, 0, 0, 0);
    if (current <= from) current.setDate(current.getDate() + 1);

    while (current <= to) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + interval);
    }
  }

  return dates;
}

// Web Push implementation using VAPID protocol
async function sendWebPush(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  entry: Record<string, unknown>,
): Promise<void> {
  // Get user's push subscriptions
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  const vapidPublicKey = Deno.env.get("VITE_VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[WebPush] VAPID keys not configured, skipping push delivery");
    return;
  }

  const payload = JSON.stringify({
    title: getNotificationTitle(entry.type as string),
    body: getNotificationBody(entry),
    data: {
      type: entry.type,
      event_id: entry.event_id || null,
    },
  });

  for (const sub of subs) {
    try {
      await sendVapidPush(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
        vapidPublicKey,
        vapidPrivateKey,
      );
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired or not found — remove it
        console.log(`[WebPush] Removing dead subscription: ${sub.endpoint}`);
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      } else {
        console.error(`[WebPush] Failed to send push to ${sub.endpoint}:`, err);
      }
    }
  }
}

// Minimal VAPID-based Web Push using crypto.subtle
interface PushSubscriptionInfo {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

async function sendVapidPush(
  subscription: PushSubscriptionInfo,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
): Promise<void> {
  const endpoint = new URL(subscription.endpoint);
  const audience = `${endpoint.protocol}//${endpoint.host}`;

  // Create VAPID JWT
  const vapidToken = await createVapidJwt(audience, vapidPublicKey, vapidPrivateKey);

  // Encrypt payload using Web Push encryption (aes128gcm)
  const encrypted = await encryptPayload(
    payload,
    subscription.keys.p256dh,
    subscription.keys.auth,
  );

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${vapidToken}, k=${vapidPublicKey}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Urgency: "normal",
    },
    body: encrypted,
  });

  if (!response.ok) {
    const error = new Error(`Push service returned ${response.status}`);
    (error as unknown as Record<string, unknown>).statusCode = response.status;
    throw error;
  }
}

async function createVapidJwt(
  audience: string,
  _publicKey: string,
  privateKeyBase64: string,
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: "mailto:admin@mtgx.app",
  };

  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const claimsB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const unsignedToken = `${headerB64}.${claimsB64}`;

  // Import the VAPID private key
  const privateKeyBytes = base64urlDecode(privateKeyBase64);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  ).catch(async (pkcs8Err) => {
    console.error("[WebPush] PKCS8 key import failed, trying raw import:", pkcs8Err);
    // Try JWK import if PKCS8 fails (raw 32-byte key)
    const jwk = {
      kty: "EC",
      crv: "P-256",
      d: base64urlEncode(privateKeyBytes),
      x: "",
      y: "",
    };
    // For raw key format, we need to derive x,y from d
    // Fallback: try raw import
    return await crypto.subtle.importKey(
      "raw",
      privateKeyBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
  });

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken),
  );

  const signatureB64 = base64urlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string,
): Promise<Uint8Array> {
  const payloadBytes = new TextEncoder().encode(payload);

  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  // Import subscriber's public key
  const subscriberPubKeyBytes = base64urlDecode(p256dhBase64);
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    subscriberPubKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberKey },
    localKeyPair.privateKey,
    256,
  );

  // Auth secret
  const authSecret = base64urlDecode(authBase64);

  // HKDF to derive content encryption key and nonce
  // IKM = HKDF(auth_secret, shared_secret, "Content-Encoding: auth\0", 32)
  const ikm = await hkdfDerive(
    new Uint8Array(sharedSecret),
    authSecret,
    new TextEncoder().encode("Content-Encoding: auth\0"),
    32,
  );

  // Export local public key
  const localPubKey = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPubKeyBytes = new Uint8Array(localPubKey);

  // Build context for key/nonce derivation
  // context = "P-256" || 0x00 || len(subscriber_pub) || subscriber_pub || len(local_pub) || local_pub
  const context = buildContext(subscriberPubKeyBytes, localPubKeyBytes);

  // CEK = HKDF(salt, ikm, "Content-Encoding: aesgcm\0" + context, 16)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cekInfo = concatBytes(new TextEncoder().encode("Content-Encoding: aesgcm\0"), context);
  const cek = await hkdfDerive(ikm, salt, cekInfo, 16);

  // Nonce = HKDF(salt, ikm, "Content-Encoding: nonce\0" + context, 12)
  const nonceInfo = concatBytes(new TextEncoder().encode("Content-Encoding: nonce\0"), context);
  const nonce = await hkdfDerive(ikm, salt, nonceInfo, 12);

  // Pad payload (2 bytes of padding length + padding)
  const paddedPayload = new Uint8Array(2 + payloadBytes.length);
  paddedPayload[0] = 0;
  paddedPayload[1] = 0;
  paddedPayload.set(payloadBytes, 2);

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    aesKey,
    paddedPayload,
  );

  // Build aes128gcm record:
  // salt (16) || rs (4) || idlen (1) || keyid (65) || encrypted_data
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);

  const result = concatBytes(
    salt,
    rs,
    new Uint8Array([localPubKeyBytes.length]),
    localPubKeyBytes,
    new Uint8Array(encrypted),
  );

  return result;
}

function buildContext(subscriberPub: Uint8Array, localPub: Uint8Array): Uint8Array {
  const label = new TextEncoder().encode("P-256\0");
  const subscriberLen = new Uint8Array(2);
  new DataView(subscriberLen.buffer).setUint16(0, subscriberPub.length, false);
  const localLen = new Uint8Array(2);
  new DataView(localLen.buffer).setUint16(0, localPub.length, false);

  return concatBytes(label, subscriberLen, subscriberPub, localLen, localPub);
}

async function hkdfDerive(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function base64urlEncode(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binString).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(padded + padding);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case "new_event": return "New event nearby!";
    case "min_reached": return "Game is on!";
    case "reminder": return "Event tomorrow!";
    case "event_cancelled": return "Event cancelled";
    case "lfg_match": return "Someone is looking for a game!";
    case "player_invite": return "You've been invited to play!";
    case "invite_accepted": return "Invite accepted!";
    case "auto_match": return "New matching event!";
    case "organizer_message": return "Message from organizer";
    case "attendance_confirmation": return "Confirm your attendance";
    case "player_recruitment": return "A game needs you!";
    case "rsvp_waitlisted": return "You're on the waitlist";
    case "waitlist_promoted": return "You got a spot!";
    default: return "MTGX Notification";
  }
}

function getNotificationBody(entry: Record<string, unknown>): string {
  const payload = entry.payload as Record<string, unknown>;
  switch (entry.type) {
    case "new_event":
      return `A new ${payload.format} event in ${payload.city}`;
    case "min_reached":
      return `Minimum players reached (${payload.going_count}/${payload.min_players})`;
    case "reminder":
      return `${payload.title || "Your event"} starts tomorrow`;
    case "event_cancelled":
      return `${payload.title || "An event"} has been cancelled`;
    case "lfg_match":
      return `Someone in ${payload.city} is looking for ${payload.format}`;
    case "player_invite":
      return `${payload.from_name || "Someone"} invited you to play`;
    case "invite_accepted":
      return `${payload.to_name || "Someone"} accepted your invitation`;
    case "auto_match":
      return `A new ${payload.format} event in ${payload.city} matches your preferences`;
    case "organizer_message":
      return `${payload.message || "New message about your event"}`;
    case "attendance_confirmation":
      return `${payload.title || "Your event"} is coming up — are you still going?`;
    case "player_recruitment":
      return `${payload.title || "An event"} needs ${payload.spots_remaining || "more"} player(s) — join now!`;
    case "rsvp_waitlisted":
      return `Event is full — you're #${payload.queue_position || "?"} on the waitlist`;
    case "waitlist_promoted":
      return "A spot opened up and you've been moved from the waitlist to going!";
    default:
      return "Check the app for details";
  }
}
