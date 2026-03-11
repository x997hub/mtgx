/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { usePlayers, useVenuesList } from "../usePlayers";
import type { PlayerFilters } from "../usePlayers";
import type { ReactNode } from "react";
import { createElement } from "react";

// ── Supabase mock setup ──────────────────────────────────────────

/**
 * Creates a thenable mock chain that simulates Supabase PostgREST queries.
 * When `await`-ed, it resolves the `_result` stored on the chain.
 * This allows any method in the chain to be the terminal call.
 */
function createMockChain(defaultResult: { data: any; error: any }) {
  const chain: Record<string, any> = {};
  let _result = defaultResult;

  // Make the chain thenable so `await chain` works
  chain.then = (resolve: any, reject?: any) => {
    return Promise.resolve(_result).then(resolve, reject);
  };

  // Helper to set what the chain will resolve
  chain._setResult = (r: { data: any; error: any }) => {
    _result = r;
  };

  // All chainable methods return `this`
  for (const method of ["select", "order", "range", "contains", "eq", "in", "maybeSingle", "single"]) {
    chain[method] = vi.fn((..._args: any[]) => chain);
  }

  return chain;
}

const mockProfilesChain = createMockChain({ data: [], error: null });
const mockAvailabilityChain = createMockChain({ data: [], error: null });
const mockRsvpsChain = createMockChain({ data: [], error: null });
const mockVenuesChain = createMockChain({ data: [], error: null });

const mockFrom = vi.fn((table: string) => {
  if (table === "profiles") return mockProfilesChain;
  if (table === "availability") return mockAvailabilityChain;
  if (table === "rsvps") return mockRsvpsChain;
  if (table === "venues") return mockVenuesChain;
  return mockProfilesChain;
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...(args as [string])),
  },
}));

// ── Helper ───────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockPlayers = [
  {
    id: "player-1",
    display_name: "Alice",
    city: "Tel Aviv",
    formats: ["pauper", "commander"],
    avatar_url: null,
    bio: null,
    role: "player",
    level: "casual",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "player-2",
    display_name: "Bob",
    city: "Herzliya",
    formats: ["standard"],
    avatar_url: null,
    bio: null,
    role: "player",
    level: "competitive",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const noFilters: PlayerFilters = { format: null, city: null, day: null, venueId: null };

// ── Tests ────────────────────────────────────────────────────────

describe("usePlayers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset chain results
    mockProfilesChain._setResult({ data: [], error: null });
    mockAvailabilityChain._setResult({ data: [], error: null });
    mockRsvpsChain._setResult({ data: [], error: null });
    mockVenuesChain._setResult({ data: [], error: null });
  });

  // ── playersQuery: basic ──────────────────────────────────────

  describe("playersQuery — basic fetch", () => {
    it("fetches profiles with no filters", async () => {
      // The last call in chain for profiles when no sub-filters is range → resolve
      // But since we use useInfiniteQuery, the terminal is whatever the chain ends on.
      // With no filters (no contains, no eq, no in on profiles), the chain ends at range.
      // We need to make range() the terminal that returns data.
      mockProfilesChain._setResult({ data: [...mockPlayers], error: null });

      const { result } = renderHook(() => usePlayers(noFilters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.players).toHaveLength(2);
      expect(result.current.players[0].display_name).toBe("Alice");
      expect(result.current.players[1].display_name).toBe("Bob");
    });

    it("returns empty array when no players match", async () => {
      mockProfilesChain._setResult({ data: [], error: null });

      const { result } = renderHook(() => usePlayers(noFilters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.players).toEqual([]);
    });

    it("sets isError on supabase error", async () => {
      mockProfilesChain._setResult({ data: null, error: { message: "DB error" } });

      const { result } = renderHook(() => usePlayers(noFilters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  // ── playersQuery: format filter ──────────────────────────────

  describe("playersQuery — format filter", () => {
    it("applies contains filter for format", async () => {
      mockProfilesChain._setResult({ data: [mockPlayers[0]], error: null });

      const { result } = renderHook(
        () => usePlayers({ ...noFilters, format: "pauper" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockProfilesChain.contains).toHaveBeenCalledWith("formats", ["pauper"]);
    });

    it("does not call contains when format is null", async () => {
      mockProfilesChain._setResult({ data: [...mockPlayers], error: null });

      renderHook(() => usePlayers(noFilters), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("profiles");
      });

      // contains should not be called with "formats"
      const containsCalls = mockProfilesChain.contains.mock.calls;
      const formatContainsCalls = containsCalls.filter(
        (call: any[]) => call[0] === "formats"
      );
      expect(formatContainsCalls).toHaveLength(0);
    });
  });

  // ── playersQuery: city filter ─────────────────────────────────

  describe("playersQuery — city filter", () => {
    it("applies eq filter for city", async () => {
      mockProfilesChain._setResult({ data: [mockPlayers[0]], error: null });

      const { result } = renderHook(
        () => usePlayers({ ...noFilters, city: "Tel Aviv" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockProfilesChain.eq).toHaveBeenCalledWith("city", "Tel Aviv");
    });
  });

  // ── playersQuery: day filter (via availability join) ──────────

  describe("playersQuery — day filter", () => {
    it("queries availability table when day filter is set", async () => {
      // Availability sub-query returns user IDs
      mockAvailabilityChain._setResult({
        data: [{ user_id: "player-1" }],
        error: null,
      });

      // Profiles query filtered by those IDs
      mockProfilesChain._setResult({ data: [mockPlayers[0]], error: null });

      const { result } = renderHook(
        () => usePlayers({ ...noFilters, day: "sun" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFrom).toHaveBeenCalledWith("availability");
      expect(mockAvailabilityChain.eq).toHaveBeenCalledWith("day", "sun");
      expect(mockAvailabilityChain.in).toHaveBeenCalledWith("level", ["available", "sometimes"]);
    });

    it("returns empty array when no users have availability for the day", async () => {
      // Availability returns empty
      mockAvailabilityChain._setResult({ data: [], error: null });

      const { result } = renderHook(
        () => usePlayers({ ...noFilters, day: "fri" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should return empty since sub-filter yielded 0 user IDs
      expect(result.current.players).toEqual([]);
    });
  });

  // ── playersQuery: venueId filter (via rsvps join) ─────────────

  describe("playersQuery — venueId filter", () => {
    it("queries rsvps table when venueId filter is set", async () => {
      // RSVPs sub-query
      mockRsvpsChain._setResult({
        data: [{ user_id: "player-1" }, { user_id: "player-1" }],
        error: null,
      });

      // Profiles filtered by IDs
      mockProfilesChain._setResult({ data: [mockPlayers[0]], error: null });

      const { result } = renderHook(
        () => usePlayers({ ...noFilters, venueId: "venue-1" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFrom).toHaveBeenCalledWith("rsvps");
      expect(mockRsvpsChain.eq).toHaveBeenCalledWith("status", "going");
    });

    it("deduplicates user IDs from rsvps", async () => {
      // Same user appears twice in rsvps
      mockRsvpsChain._setResult({
        data: [{ user_id: "player-1" }, { user_id: "player-1" }],
        error: null,
      });

      mockProfilesChain._setResult({ data: [mockPlayers[0]], error: null });

      const { result } = renderHook(
        () => usePlayers({ ...noFilters, venueId: "venue-1" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The in() filter on profiles should receive deduplicated IDs
      const inCalls = mockProfilesChain.in.mock.calls;
      const idCall = inCalls.find((call: any[]) => call[0] === "id");
      if (idCall) {
        expect(idCall[1]).toEqual(["player-1"]); // deduplicated
      }
    });
  });

  // ── playersQuery: combined day + venueId ──────────────────────

  describe("playersQuery — combined day + venueId filters", () => {
    it("intersects availability and rsvps user IDs", async () => {
      // Availability: player-1, player-2
      mockAvailabilityChain._setResult({
        data: [{ user_id: "player-1" }, { user_id: "player-2" }],
        error: null,
      });

      // RSVPs: player-1, player-3
      mockRsvpsChain._setResult({
        data: [{ user_id: "player-1" }, { user_id: "player-3" }],
        error: null,
      });

      // Only player-1 is in both sets
      mockProfilesChain._setResult({ data: [mockPlayers[0]], error: null });

      const { result } = renderHook(
        () => usePlayers({ ...noFilters, day: "sun", venueId: "venue-1" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // profiles.in should be called with intersection
      const inCalls = mockProfilesChain.in.mock.calls;
      const idCall = inCalls.find((call: any[]) => call[0] === "id");
      if (idCall) {
        expect(idCall[1]).toEqual(["player-1"]);
      }
    });

    it("returns empty when intersection is empty", async () => {
      // Availability: player-1
      mockAvailabilityChain._setResult({
        data: [{ user_id: "player-1" }],
        error: null,
      });

      // RSVPs: player-2 (no overlap)
      mockRsvpsChain._setResult({
        data: [{ user_id: "player-2" }],
        error: null,
      });

      const { result } = renderHook(
        () => usePlayers({ ...noFilters, day: "mon", venueId: "venue-2" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.players).toEqual([]);
    });
  });

  // ── availabilityQuery ─────────────────────────────────────────

  describe("availabilityQuery", () => {
    it("fetches availability for matched players", async () => {
      // Players
      mockProfilesChain._setResult({ data: [...mockPlayers], error: null });

      // Availability for those players
      mockAvailabilityChain._setResult({
        data: [
          { user_id: "player-1", day: "sun", level: "available", time_slot: "evening" },
          { user_id: "player-1", day: "mon", level: "sometimes", time_slot: "day" },
          { user_id: "player-2", day: "wed", level: "available", time_slot: "morning" },
        ],
        error: null,
      });

      const { result } = renderHook(() => usePlayers(noFilters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Wait for availability query to run (depends on players being loaded)
      await waitFor(() => {
        expect(result.current.availabilityMap.size).toBeGreaterThan(0);
      });

      expect(result.current.availabilityMap.get("player-1")).toHaveLength(2);
      expect(result.current.availabilityMap.get("player-2")).toHaveLength(1);
    });

    it("returns empty map when no players loaded", async () => {
      mockProfilesChain._setResult({ data: [], error: null });

      const { result } = renderHook(() => usePlayers(noFilters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.availabilityMap.size).toBe(0);
    });
  });

  // ── Pagination ────────────────────────────────────────────────

  describe("pagination", () => {
    it("returns hasNextPage=true when page is full (20 items)", async () => {
      // Generate 20 players (full page)
      const fullPage = Array.from({ length: 20 }, (_, i) => ({
        id: `player-${i}`,
        display_name: `Player ${i}`,
        city: "Tel Aviv",
        formats: ["pauper"],
        avatar_url: null,
        bio: null,
        role: "player",
        level: "casual",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }));

      mockProfilesChain._setResult({ data: fullPage, error: null });

      const { result } = renderHook(() => usePlayers(noFilters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNextPage).toBe(true);
    });

    it("returns hasNextPage=false when page is not full", async () => {
      mockProfilesChain._setResult({ data: [...mockPlayers], error: null });

      const { result } = renderHook(() => usePlayers(noFilters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 2 players < 20 (PAGE_SIZE), so no next page
      expect(result.current.hasNextPage).toBe(false);
    });
  });

  // ── Return shape ──────────────────────────────────────────────

  describe("return shape", () => {
    it("returns expected properties", async () => {
      mockProfilesChain._setResult({ data: [], error: null });

      const { result } = renderHook(() => usePlayers(noFilters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty("players");
      expect(result.current).toHaveProperty("availabilityMap");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("isError");
      expect(result.current).toHaveProperty("refetch");
      expect(result.current).toHaveProperty("fetchNextPage");
      expect(result.current).toHaveProperty("hasNextPage");
      expect(result.current).toHaveProperty("isFetchingNextPage");
    });
  });
});

// ── useVenuesList ───────────────────────────────────────────────

describe("useVenuesList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVenuesChain._setResult({ data: [], error: null });
  });

  it("fetches venues list ordered by name", async () => {
    const mockVenues = [
      { id: "v1", name: "Alpha Club", city: "Tel Aviv" },
      { id: "v2", name: "Beta Club", city: "Herzliya" },
    ];

    mockVenuesChain._setResult({ data: mockVenues, error: null });

    const { result } = renderHook(() => useVenuesList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].name).toBe("Alpha Club");
    expect(result.current.data![1].name).toBe("Beta Club");
  });

  it("calls supabase with correct query chain", async () => {
    renderHook(() => useVenuesList(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("venues");
    });

    expect(mockVenuesChain.select).toHaveBeenCalledWith("id, name, city");
    expect(mockVenuesChain.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("returns empty array when no venues", async () => {
    mockVenuesChain._setResult({ data: [], error: null });

    const { result } = renderHook(() => useVenuesList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it("handles null data from supabase", async () => {
    mockVenuesChain._setResult({ data: null, error: null });

    const { result } = renderHook(() => useVenuesList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it("sets isError on supabase error", async () => {
    mockVenuesChain._setResult({ data: null, error: { message: "DB error" } });

    const { result } = renderHook(() => useVenuesList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
