/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { useVenues } from "../useVenues";
import type { ReactNode } from "react";
import { createElement } from "react";

// Two separate query chains: one for venues, one for events
const mockVenuesChain = {
  select: vi.fn().mockReturnThis(),
  order: vi.fn<() => Promise<{ data: any; error: any }>>()
    .mockResolvedValue({ data: [], error: null }),
};

const mockEventsChain = {
  select: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn<() => Promise<{ data: any; error: any }>>()
    .mockResolvedValue({ data: [], error: null }),
};

const mockFrom = vi.fn((table: string) => {
  if (table === "venues") return mockVenuesChain;
  if (table === "events") return mockEventsChain;
  return mockVenuesChain;
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...(args as [string])),
  },
}));

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockVenues = [
  {
    id: "venue-1",
    name: "Game Zone",
    city: "Tel Aviv",
    address: "123 Main St",
    owner_id: "user-1",
    supported_formats: ["pauper", "commander"],
    capacity: 32,
    hours: null,
    contacts: null,
    latitude: 32.0853,
    longitude: 34.7818,
    venue_qr_token: "token-1",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "venue-2",
    name: "Card Castle",
    city: "Herzliya",
    address: "456 Oak Ave",
    owner_id: "user-2",
    supported_formats: ["standard", "draft"],
    capacity: 20,
    hours: null,
    contacts: null,
    latitude: null,
    longitude: null,
    venue_qr_token: "token-2",
    created_at: "2026-01-02T00:00:00Z",
  },
];

describe("useVenues", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset chains
    mockVenuesChain.select.mockReturnThis();
    mockVenuesChain.order.mockResolvedValue({ data: [], error: null });

    mockEventsChain.select.mockReturnThis();
    mockEventsChain.not.mockReturnThis();
    mockEventsChain.eq.mockReturnThis();
    mockEventsChain.gte.mockResolvedValue({ data: [], error: null });
  });

  it("fetches venues and returns them", async () => {
    mockVenuesChain.order.mockResolvedValue({ data: [...mockVenues], error: null });

    const { result } = renderHook(() => useVenues(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].name).toBe("Game Zone");
    expect(result.current.data![1].name).toBe("Card Castle");
  });

  it("returns empty array when no venues", async () => {
    mockVenuesChain.order.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useVenues(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it("throws on supabase error", async () => {
    mockVenuesChain.order.mockResolvedValue({ data: null, error: { message: "DB error" } });

    const { result } = renderHook(() => useVenues(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("computes upcoming_event_count from events query", async () => {
    mockVenuesChain.order.mockResolvedValue({ data: [...mockVenues], error: null });
    mockEventsChain.gte.mockResolvedValue({
      data: [
        { venue_id: "venue-1" },
        { venue_id: "venue-1" },
        { venue_id: "venue-2" },
      ],
      error: null,
    });

    const { result } = renderHook(() => useVenues(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data![0].upcoming_event_count).toBe(2);
    expect(result.current.data![1].upcoming_event_count).toBe(1);
  });

  it("sets upcoming_event_count to 0 when no events match venue", async () => {
    mockVenuesChain.order.mockResolvedValue({ data: [...mockVenues], error: null });
    mockEventsChain.gte.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useVenues(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data![0].upcoming_event_count).toBe(0);
    expect(result.current.data![1].upcoming_event_count).toBe(0);
  });

  it("handles null countData gracefully", async () => {
    mockVenuesChain.order.mockResolvedValue({ data: [...mockVenues], error: null });
    mockEventsChain.gte.mockResolvedValue({ data: null, error: { message: "count error" } });

    const { result } = renderHook(() => useVenues(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should still return venues with 0 counts
    expect(result.current.data![0].upcoming_event_count).toBe(0);
    expect(result.current.data![1].upcoming_event_count).toBe(0);
  });

  it("calls supabase.from('venues') with correct query chain", async () => {
    mockVenuesChain.order.mockResolvedValue({ data: [], error: null });

    renderHook(() => useVenues(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("venues");
    });

    expect(mockVenuesChain.select).toHaveBeenCalledWith("*");
    expect(mockVenuesChain.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("calls events query with correct filters", async () => {
    mockVenuesChain.order.mockResolvedValue({ data: [...mockVenues], error: null });

    renderHook(() => useVenues(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("events");
    });

    expect(mockEventsChain.select).toHaveBeenCalledWith("venue_id");
    expect(mockEventsChain.not).toHaveBeenCalledWith("venue_id", "is", null);
    expect(mockEventsChain.eq).toHaveBeenCalledWith("status", "active");
  });
});
