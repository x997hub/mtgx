import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const results = {
        outbox_processed: 0,
        expired_events: 0,
        expired_lfg: 0,
        reminders_sent: 0,
        min_reached: 0,
        daily_report: false,
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
    }
    catch (err) {
        console.error("Poller error:", err);
    }
    return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
});
async function processOutbox(supabase) {
    const { data: entries, error } = await supabase
        .from("notification_outbox")
        .select("*")
        .eq("status", "pending")
        .lt("attempts", 3)
        .order("created_at", { ascending: true })
        .limit(50);
    if (error || !entries || entries.length === 0)
        return 0;
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
                    if (existing)
                        continue;
                }
                // Create in-app notification
                await supabase.from("notifications").insert({
                    user_id: userId,
                    event_id: entry.event_id,
                    type: entry.type,
                    title: getNotificationTitle(entry.type),
                    body: getNotificationBody(entry),
                });
                // Record dedup
                if (entry.event_id) {
                    await supabase.from("notification_sent").upsert({
                        user_id: userId,
                        event_id: entry.event_id,
                        reason: entry.type,
                    });
                }
                // Send Web Push (placeholder - requires VAPID setup)
                await sendWebPush(supabase, userId, entry);
            }
            // Mark as sent
            await supabase
                .from("notification_outbox")
                .update({ status: "sent", last_attempt_at: new Date().toISOString() })
                .eq("id", entry.id);
            processed++;
        }
        catch (err) {
            console.error(`Failed to process outbox entry ${entry.id}:`, err);
            // Increment attempts
            const newAttempts = entry.attempts + 1;
            await supabase
                .from("notification_outbox")
                .update({
                attempts: newAttempts,
                status: newAttempts >= 3 ? "dead" : "pending",
                last_attempt_at: new Date().toISOString(),
            })
                .eq("id", entry.id);
        }
    }
    return processed;
}
async function getRecipients(supabase, entry) {
    const payload = entry.payload;
    const recipientSet = new Set();
    if (entry.type === "new_event" && entry.event_id) {
        // Direct subscribers (organizer or venue)
        const organizerId = payload.organizer_id;
        const venueId = payload.venue_id;
        // Subscribers to the organizer
        const { data: orgSubs } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("target_type", "organizer")
            .eq("target_id", organizerId);
        orgSubs?.forEach((s) => recipientSet.add(s.user_id));
        // Subscribers to the venue
        if (venueId) {
            const { data: venueSubs } = await supabase
                .from("subscriptions")
                .select("user_id")
                .eq("target_type", "venue")
                .eq("target_id", venueId);
            venueSubs?.forEach((s) => recipientSet.add(s.user_id));
        }
        // Format+city subscribers with availability match
        const format = payload.format;
        const city = payload.city;
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
            const matchedIds = new Set((matched || []).map((m) => m.user_id));
            formatCitySubs.forEach((s) => {
                if (matchedIds.has(s.user_id)) {
                    recipientSet.add(s.user_id);
                }
            });
        }
        // Remove the organizer from recipients
        recipientSet.delete(organizerId);
    }
    return Array.from(recipientSet);
}
async function expireQuickMeetups(supabase) {
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
async function expireLfgSignals(supabase) {
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
async function sendReminders(supabase) {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    // Find events starting between 23h and 24h from now
    const { data: events, error } = await supabase
        .from("events")
        .select("id, title, format, city, starts_at")
        .eq("status", "active")
        .gte("starts_at", in23h.toISOString())
        .lte("starts_at", in24h.toISOString());
    if (error || !events || events.length === 0)
        return 0;
    let sent = 0;
    for (const event of events) {
        // Get all going/maybe RSVPs
        const { data: rsvps } = await supabase
            .from("rsvps")
            .select("user_id")
            .eq("event_id", event.id)
            .in("status", ["going", "maybe"]);
        if (!rsvps)
            continue;
        // Write outbox entry for reminder
        await supabase.from("notification_outbox").insert({
            event_id: event.id,
            type: "reminder",
            payload: {
                event_id: event.id,
                title: event.title,
                starts_at: event.starts_at,
                recipients: rsvps.map((r) => r.user_id),
            },
        });
        sent += rsvps.length;
    }
    return sent;
}
async function checkMinPlayers(supabase) {
    // Find active events that just reached min_players
    const { data: events, error } = await supabase
        .from("events")
        .select("id, title, min_players, organizer_id, starts_at")
        .eq("status", "active")
        .gt("starts_at", new Date().toISOString());
    if (error || !events)
        return 0;
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
async function maybeGenerateDailyReport(supabase) {
    const now = new Date();
    const hour = now.getUTCHours();
    // Only generate at ~08:00 UTC (approximate, since poller runs every minute)
    if (hour !== 8)
        return false;
    const today = now.toISOString().split("T")[0];
    // Check if report already exists for today
    const { data: existing } = await supabase
        .from("admin_reports")
        .select("id")
        .eq("report_date", today)
        .maybeSingle();
    if (existing)
        return false;
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    // Gather stats
    const { count: newUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday);
    const { data: eventCounts } = await supabase
        .from("events")
        .select("type")
        .gte("created_at", yesterday);
    const bigEvents = eventCounts?.filter((e) => e.type === "big").length || 0;
    const quickEvents = eventCounts?.filter((e) => e.type === "quick").length || 0;
    const { data: rsvpCounts } = await supabase
        .from("rsvps")
        .select("status")
        .gte("created_at", yesterday);
    const goingCount = rsvpCounts?.filter((r) => r.status === "going").length || 0;
    const maybeCount = rsvpCounts?.filter((r) => r.status === "maybe").length || 0;
    const notGoingCount = rsvpCounts?.filter((r) => r.status === "not_going").length || 0;
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
async function sendWebPush(supabase, userId, _entry) {
    // Get user's push subscriptions
    const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);
    if (!subs || subs.length === 0)
        return;
    // TODO: Implement actual Web Push sending with VAPID keys
    // For now, this is a placeholder. In production, use web-push library:
    //
    // import webpush from 'web-push';
    // webpush.setVapidDetails('mailto:admin@mtgx.app', VAPID_PUBLIC, VAPID_PRIVATE);
    // for (const sub of subs) {
    //   await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
    // }
    console.log(`[WebPush] Would send push to ${subs.length} subscriptions for user ${userId}`);
}
function getNotificationTitle(type) {
    switch (type) {
        case "new_event": return "New event nearby!";
        case "min_reached": return "Game is on!";
        case "reminder": return "Event tomorrow!";
        case "event_cancelled": return "Event cancelled";
        case "lfg_match": return "Someone is looking for a game!";
        default: return "MTGX Notification";
    }
}
function getNotificationBody(entry) {
    const payload = entry.payload;
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
        default:
            return "Check the app for details";
    }
}
