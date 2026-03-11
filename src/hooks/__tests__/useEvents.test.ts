/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { useEvents } from "../useEvents";
import { useAuthStore } from "@/store/authStore";
import type { ReactNode } from "react";
import { createElement } from "react";

// The query chain: supabase.from("events").select().eq().eq().gte().order().range()
// The query chain object is awaitable — `const { data, error } = await query;`
// So `range()` must return a promise-like that resolves to { data, error }.

const mockRange = vi.fn<() => Promise<{ data: any; error: any }>>()
  .mockResolvedValue({ data: [], error: null });

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: mockRange,
};

const mockFrom = vi.fn().mockReturnValue(mockChain);

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "fresh-mock-token" } },
      }),
    },
  },
}));

// Mock useRealtimeSubscription
vi.mock("@/hooks/useRealtimeSubscription", () => ({
  useRealtimeSubscription: vi.fn(),
}));

// Mock apiFetch (used by createEvent)
const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiUrl: (path: string) => `https://test.supabase.co/functions/v1/mtgx-api${path}`,
}));

// Mock toast
vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock filterStore — uses selector pattern: useFilterStore((s) => s.format)
let mockFormat: string | null = null;
let mockCity: string | null = null;
vi.mock("@/store/filterStore", () => ({
  useFilterStore: (selector: (s: any) => any) =>
    selector({ format: mockFormat, city: mockCity }),
}));

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockEvents = [
  {
    id: "event-1",
    organizer_id: "user-1",
    venue_id: null,
    type: "big",
    title: "Pauper Cup #1",
    format: "pauper",
    city: "Tel Aviv",
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    duration_min: 180,
    min_players: 4,
    max_players: 16,
    fee_text: null,
    description: "Test event",
    status: "active",
    cloned_from: null,
    expires_at: null,
    created_at: "2026-01-01T00:00:00Z",
    venues: null,
    rsvps: [{ count: 5 }],
  },
  {
    id: "event-2",
    organizer_id: "user-2",
    venue_id: null,
    type: "quick",
    title: "Commander Evening",
    format: "commander",
    city: "Herzliya",
    starts_at: new Date(Date.now() + 172800000).toISOString(),
    duration_min: null,
    min_players: 4,
    max_players: null,
    fee_text: null,
    description: null,
    status: "active",
    cloned_from: null,
    expires_at: null,
    created_at: "2026-01-02T00:00:00Z",
    venues: { name: "Game Zone", city: "Herzliya" },
    rsvps: [{ count: 3 }],
  },
];

describe("useEvents", () => {
  const initialAuthState = useAuthStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFormat = null;
    mockCity = null;

    // Reset mock chain
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.gte.mockReturnThis();
    mockChain.order.mockReturnThis();
    mockRange.mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue(mockChain);
    mockApiFetch.mockReset();

    useAuthStore.setState(initialAuthState, true);
  });

  afterEach(() => {
    useAuthStore.setState(initialAuthState, true);
  });

  it("fetches events and returns them as a flat array", async () => {
    mockRange.mockResolvedValue({ data: [...mockEvents], error: null });

    const { result } = renderHook(() => useEvents(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toHaveLength(2);
    expect(result.current.events[0].id).toBe("event-1");
    expect(result.current.events[1].id).toBe("event-2");
  });

  it("returns empty array when no events", async () => {
    mockRange.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual([]);
  });

  it("returns empty events on supabase error", async () => {
    mockRange.mockResolvedValue({ data: null, error: { message: "DB error" } });

    const { result } = renderHook(() => useEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // On error, events should be empty (query failed)
    expect(result.current.events).toEqual([]);
  });

  it("calls supabase.from('events') with correct query chain", async () => {
    mockRange.mockResolvedValue({ data: [], error: null });

    renderHook(() => useEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("events");
    });

    expect(mockChain.select).toHaveBeenCalled();
    expect(mockChain.eq).toHaveBeenCalledWith("status", "active");
  });

  it("createEvent calls apiFetch and returns event data", async () => {
    mockRange.mockResolvedValue({ data: [], error: null });

    // Set auth state for createEvent
    useAuthStore.setState({
      session: { access_token: "mock-token", user: { id: "user-1" } } as any,
      user: { id: "user-1" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const createdEvent = { id: "new-event-123", title: "New Event" };
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ event: createdEvent }),
    });

    const { result } = renderHook(() => useEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newEvent = {
      organizer_id: "user-1",
      type: "big" as const,
      title: "New Event",
      format: "pauper" as const,
      city: "Tel Aviv",
      starts_at: new Date().toISOString(),
      min_players: 4,
      max_players: 16,
    };

    let createdResult: any;
    await act(async () => {
      createdResult = await result.current.createEvent(newEvent);
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(newEvent),
      })
    );
    expect(createdResult).toEqual(createdEvent);
  });

  it("createEvent throws when not authenticated", async () => {
    mockRange.mockResolvedValue({ data: [], error: null });
    // session is null by default

    const { result } = renderHook(() => useEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.createEvent({
          organizer_id: "user-1",
          type: "big" as const,
          title: "Dup Event",
          format: "pauper" as const,
          city: "Tel Aviv",
          starts_at: new Date().toISOString(),
          min_players: 4,
          max_players: 16,
        });
      })
    ).rejects.toThrow("Not authenticated");
  });

  it("createEvent throws when API returns error", async () => {
    mockRange.mockResolvedValue({ data: [], error: null });

    useAuthStore.setState({
      session: { access_token: "mock-token", user: { id: "user-1" } } as any,
      user: { id: "user-1" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockApiFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Validation failed" }),
    });

    const { result } = renderHook(() => useEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.createEvent({
          organizer_id: "user-1",
          type: "big" as const,
          title: "Bad Event",
          format: "pauper" as const,
          city: "Tel Aviv",
          starts_at: new Date().toISOString(),
          min_players: 4,
          max_players: 16,
        });
      })
    ).rejects.toThrow("Validation failed");
  });

  it("exposes isCreating and fetchNextPage", async () => {
    mockRange.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isCreating).toBe(false);
    expect(typeof result.current.fetchNextPage).toBe("function");
    expect(typeof result.current.createEvent).toBe("function");
  });

  it("hasNextPage is false when fewer than PAGE_SIZE events returned", async () => {
    mockRange.mockResolvedValue({ data: [mockEvents[0]], error: null });

    const { result } = renderHook(() => useEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(false);
  });
});
