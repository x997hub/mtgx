import { test, expect } from "@playwright/test";
import {
  adminClient,
  deleteEvent,
  deleteRsvp,
  getRsvp,
  findRecentEventsByOrganizer,
  ensureTestUser,
} from "./helpers/supabase-admin";
import { bigEventData, quickMeetupData, futureDate } from "./helpers/test-data";

// ── Get test user ID ─────────────────────────────────────────────────

let testUserId: string;

test.beforeAll(async () => {
  const user = await ensureTestUser();
  testUserId = user.id;
});

// ── Cleanup: safety net — delete any lingering test events ───────────

test.afterAll(async () => {
  const events = await findRecentEventsByOrganizer(testUserId);
  for (const ev of events) {
    if (ev.title?.startsWith("E2E ")) {
      await deleteEvent(ev.id);
    }
  }
});

// ── Tests ────────────────────────────────────────────────────────────

test.describe.serial("Event Creation & RSVP Integration", () => {
  // Track created event IDs for cleanup
  const createdEventIds: string[] = [];

  test.afterEach(async () => {
    // Cleanup all events created during the test
    for (const id of createdEventIds) {
      await deleteEvent(id);
    }
    createdEventIds.length = 0;
  });

  // ── Test 1: Create Big Event (online mode) ───────────────────────

  test("create a big event in online mode", async ({ page }) => {
    const data = bigEventData();
    const dateStr = futureDate(3).split("T")[0]; // YYYY-MM-DD

    // Navigate to create event page
    await page.goto("/events/new");
    await page.waitForLoadState("networkidle");

    // The test user is admin, so the type toggle is visible.
    // Default is "quick", click "Big Event" toggle to switch.
    await page.getByRole("radio", { name: /Big Event/i }).click();

    // Wait for BigEventForm to appear
    await expect(page.locator("#title")).toBeVisible({ timeout: 5000 });

    // Fill title
    await page.fill("#title", data.title);

    // Select format — Radix Select
    const formatTrigger = page.locator("button[role='combobox']").first();
    await formatTrigger.click();
    await page.getByRole("option", { name: /Pauper/i }).click();

    // Click "Online" mode button
    await page.getByRole("button", { name: /Online/i }).click();

    // Select SpellTable platform
    await expect(page.locator("#platform")).toBeVisible({ timeout: 3000 });
    await page.locator("#platform").click();
    await page.getByRole("option", { name: /Spelltable/i }).click();

    // Fill join link
    await expect(page.locator("#joinlink")).toBeVisible({ timeout: 3000 });
    await page.fill("#joinlink", "https://spelltable.wizards.com/test-e2e-room");

    // Fill date
    await page.fill("#date", dateStr);

    // Click time preset "18:00"
    await page.getByRole("button", { name: "18:00", exact: true }).click();

    // Fill min players
    await page.fill("#min_players", "4");

    // Fill max players
    await page.fill("#max_players", String(data.maxPlayers));

    // Fill fee
    await page.fill("#fee", data.feeText);

    // Fill description
    await page.fill("#description", data.description);

    // Wait for the API response when submitting
    const apiResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/functions/v1/mtgx-api/events"),
      { timeout: 20000 }
    ).catch(() => null);

    // Submit the form
    await page.getByRole("button", { name: /Create Big Event/i }).click();

    // Wait for the API response
    const apiResponse = await apiResponsePromise;
    if (apiResponse) {
      const status = apiResponse.status();
      if (status >= 400) {
        const body = await apiResponse.text().catch(() => "no body");
        throw new Error(`Event creation API returned ${status}: ${body}`);
      }
    }

    // Wait for the app to process the response
    await page.waitForTimeout(2000);

    // Verify event was created in DB
    const events = await findRecentEventsByOrganizer(testUserId);
    const created = events.find((e) => e.title === data.title);
    expect(created).toBeDefined();
    createdEventIds.push(created!.id);

    // Verify event details in DB
    const { data: eventRecord } = await adminClient
      .from("events")
      .select("*")
      .eq("id", created!.id)
      .single();

    expect(eventRecord).not.toBeNull();
    expect(eventRecord!.title).toBe(data.title);
    expect(eventRecord!.type).toBe("big");
    expect(eventRecord!.format).toBe("pauper");
    expect(eventRecord!.mode).toBe("online");
    expect(eventRecord!.online_platform).toBe("spelltable");
    expect(eventRecord!.join_link).toBe("https://spelltable.wizards.com/test-e2e-room");
    expect(eventRecord!.min_players).toBe(4);
    expect(eventRecord!.max_players).toBe(data.maxPlayers);
    expect(eventRecord!.fee_text).toBe(data.feeText);
    expect(eventRecord!.description).toBe(data.description);
    expect(eventRecord!.organizer_id).toBe(testUserId);
    expect(eventRecord!.city).toBe("Online");
  });

  // ── Test 2: Create Quick Meetup (online mode) ────────────────────

  test("create a quick meetup in online mode", async ({ page }) => {
    const data = quickMeetupData();
    const dateStr = futureDate(2).split("T")[0]; // YYYY-MM-DD

    // Navigate to create event page
    await page.goto("/events/new");
    await page.waitForLoadState("networkidle");

    // Click "Quick Meetup" toggle
    await page.getByRole("radio", { name: /Quick Meetup/i }).click();

    // Wait for the quick form to render
    await expect(page.locator("#q_date")).toBeVisible({ timeout: 5000 });

    // Select format — Commander
    const formatTrigger = page.locator("button[role='combobox']").first();
    await formatTrigger.click();
    await page.getByRole("option", { name: /Commander/i }).click();

    // Click "Online" mode button
    await page.getByRole("button", { name: /Online/i }).click();

    // Select SpellTable platform
    await expect(page.locator("#q_platform")).toBeVisible({ timeout: 3000 });
    await page.locator("#q_platform").click();
    await page.getByRole("option", { name: /Spelltable/i }).click();

    // Fill join link
    await expect(page.locator("#q_joinlink")).toBeVisible({ timeout: 3000 });
    await page.fill("#q_joinlink", "https://spelltable.wizards.com/test-e2e-quick");

    // Fill date
    await page.fill("#q_date", dateStr);

    // Click time preset "18:00"
    await page.getByRole("button", { name: "18:00", exact: true }).click();

    // Fill min players
    await page.fill("#q_min_players", String(data.minPlayers));

    // Wait for the API response
    const apiResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/functions/v1/mtgx-api/events"),
      { timeout: 20000 }
    ).catch(() => null);

    // Submit the form
    await page.getByRole("button", { name: /Create Quick Meetup/i }).click();

    const apiResponse = await apiResponsePromise;
    if (apiResponse) {
      const status = apiResponse.status();
      if (status >= 400) {
        const body = await apiResponse.text().catch(() => "no body");
        throw new Error(`Quick meetup creation API returned ${status}: ${body}`);
      }
    }

    // Wait for the app to process
    await page.waitForTimeout(2000);

    // Verify event was created in DB
    const events = await findRecentEventsByOrganizer(testUserId);
    // Quick meetups have no title — find by format and recent creation
    const created = events.find((e) => !e.title || e.title === "");

    // If we can't find by empty title, pick the most recent one
    const createdEvent = created ?? events[0];
    expect(createdEvent).toBeDefined();
    createdEventIds.push(createdEvent!.id);

    // Verify event details in DB
    const { data: eventRecord } = await adminClient
      .from("events")
      .select("*")
      .eq("id", createdEvent!.id)
      .single();

    expect(eventRecord).not.toBeNull();
    expect(eventRecord!.type).toBe("quick");
    expect(eventRecord!.format).toBe("commander");
    expect(eventRecord!.mode).toBe("online");
    expect(eventRecord!.online_platform).toBe("spelltable");
    expect(eventRecord!.join_link).toBe("https://spelltable.wizards.com/test-e2e-quick");
    expect(eventRecord!.min_players).toBe(data.minPlayers);
    expect(eventRecord!.organizer_id).toBe(testUserId);
    expect(eventRecord!.city).toBe("Online");
  });

  // ── Test 3: RSVP on an event ─────────────────────────────────────

  test("RSVP going on an event", async ({ page }) => {
    // Create an event directly via admin client (not UI)
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + 5);
    startsAt.setHours(18, 0, 0, 0);

    const { data: event, error: createError } = await adminClient
      .from("events")
      .insert({
        organizer_id: testUserId,
        type: "big",
        title: "E2E RSVP Test Event",
        format: "pauper",
        city: "Online",
        starts_at: startsAt.toISOString(),
        min_players: 2,
        max_players: 8,
        status: "active",
        mode: "online",
        online_platform: "spelltable",
        join_link: "https://spelltable.wizards.com/rsvp-test",
      })
      .select("id")
      .single();

    if (createError || !event) {
      throw new Error(`Failed to create test event: ${createError?.message}`);
    }
    createdEventIds.push(event.id);

    // Navigate to event detail page
    await page.goto(`/events/${event.id}`);
    await page.waitForLoadState("networkidle");

    // Wait for the RSVP button to appear
    const rsvpButton = page.getByRole("button", { name: /RSVP/i });
    await expect(rsvpButton).toBeVisible({ timeout: 10000 });

    // Wait for the RSVP API response
    const rsvpResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/functions/v1/mtgx-api/rsvp"),
      { timeout: 15000 }
    ).catch(() => null);

    // Click RSVP button to open dialog
    await rsvpButton.click();

    // Wait for the RSVP dialog to appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click "Going" button in the dialog (exact match to avoid "Not Going")
    const goingButton = dialog.getByRole("button", { name: "Going", exact: true });
    await expect(goingButton).toBeVisible({ timeout: 3000 });
    await goingButton.click();

    // Wait for the RSVP API response
    const rsvpResponse = await rsvpResponsePromise;
    if (rsvpResponse) {
      const status = rsvpResponse.status();
      if (status >= 400) {
        const body = await rsvpResponse.text().catch(() => "no body");
        throw new Error(`RSVP API returned ${status}: ${body}`);
      }
    }

    // Wait for the dialog to close (indicates RSVP was submitted)
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Verify RSVP in DB
    const rsvp = await getRsvp(event.id, testUserId);
    expect(rsvp).not.toBeNull();
    expect(rsvp!.status).toBe("going");
    expect(rsvp!.user_id).toBe(testUserId);
    expect(rsvp!.event_id).toBe(event.id);

    // Cleanup: delete RSVP first, then event (handled by afterEach via deleteEvent)
    await deleteRsvp(event.id, testUserId);
  });
});
