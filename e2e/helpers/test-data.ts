/** Test data factories for e2e integration tests */

const timestamp = () => Date.now().toString(36);

export function bigEventData() {
  return {
    title: `E2E Big Event ${timestamp()}`,
    format: "pauper" as const,
    city: "Tel Aviv",
    minPlayers: 4,
    maxPlayers: 8,
    feeText: "Free",
    description: `Integration test event created at ${new Date().toISOString()}`,
  };
}

export function quickMeetupData() {
  return {
    format: "commander" as const,
    city: "Tel Aviv",
    minPlayers: 2,
  };
}

export function profileUpdateData() {
  return {
    displayName: `E2E User ${timestamp()}`,
    bio: `Test bio ${timestamp()}`,
    arenaUsername: `e2etester_${timestamp()}`,
  };
}

export function venueData() {
  return {
    name: `E2E Venue ${timestamp()}`,
    city: "Tel Aviv",
    address: `123 Test Street ${timestamp()}`,
    formats: ["pauper", "commander"],
  };
}

/** Generate a date 2 days from now in YYYY-MM-DDTHH:MM format (for datetime-local input) */
export function futureDate(daysFromNow = 2): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(18, 0, 0, 0);
  return d.toISOString().slice(0, 16); // "2026-03-13T18:00"
}
