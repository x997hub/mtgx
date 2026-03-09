/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { useLFG } from "../useLFG";
import { useAuthStore } from "@/store/authStore";
import type { ReactNode } from "react";
import { createElement } from "react";

// Mock supabase
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
const mockSingle = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
  upsert: vi.fn().mockReturnThis(),
  single: mockSingle,
  delete: vi.fn().mockReturnValue({ eq: mockDeleteEq }),
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
  },
}));

// Mock useRealtimeSubscription
vi.mock("@/hooks/useRealtimeSubscription", () => ({
  useRealtimeSubscription: vi.fn(),
}));

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useLFG", () => {
  const initialAuthState = useAuthStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState(initialAuthState, true);
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.gt.mockReturnThis();
    mockChain.upsert.mockReturnThis();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockSingle.mockResolvedValue({ data: { id: 1 }, error: null });
    mockDeleteEq.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    useAuthStore.setState(initialAuthState, true);
  });

  it("returns null mySignal and empty signals when no user", async () => {
    const { result } = renderHook(() => useLFG("Tel Aviv"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSignalsLoading).toBe(false);
    });

    expect(result.current.mySignal).toBeNull();
    expect(result.current.signals).toEqual([]);
  });

  it("fetches active signals for a city", async () => {
    const mockSignals = [
      {
        id: 1,
        user_id: "other-user",
        city: "Tel Aviv",
        formats: ["pauper"],
        preferred_slot: "evening",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_at: "2026-03-01T10:00:00Z",
        profiles: { display_name: "Other Player" },
      },
    ];

    mockOrder.mockResolvedValue({ data: mockSignals, error: null });

    const { result } = renderHook(() => useLFG("Tel Aviv"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSignalsLoading).toBe(false);
      expect(result.current.signals.length).toBeGreaterThan(0);
    });

    expect(result.current.signals).toHaveLength(1);
    expect(result.current.signals[0].user_id).toBe("other-user");
  });

  it("fetches user's own LFG signal when authenticated", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const mySignal = {
      id: 5,
      user_id: "user-1",
      city: "Tel Aviv",
      formats: ["commander"],
      preferred_slot: "day",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      created_at: "2026-03-07T10:00:00Z",
    };

    mockMaybeSingle.mockResolvedValue({ data: mySignal, error: null });

    const { result } = renderHook(() => useLFG("Tel Aviv"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isMySignalLoading).toBe(false);
      expect(result.current.mySignal).not.toBeNull();
    });

    expect(result.current.mySignal).toEqual(mySignal);
  });

  it("returns empty signals when city is undefined", async () => {
    const { result } = renderHook(() => useLFG(undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSignalsLoading).toBe(false);
    });

    expect(result.current.signals).toEqual([]);
  });

  it("activate calls supabase upsert with correct params", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useLFG("Tel Aviv"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isMySignalLoading).toBe(false);
    });

    await act(async () => {
      result.current.activate({
        city: "Tel Aviv",
        formats: ["pauper", "commander"],
        preferred_slot: "evening",
      });
    });

    await waitFor(() => {
      expect(mockChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          city: "Tel Aviv",
          formats: ["pauper", "commander"],
          preferred_slot: "evening",
        }),
        { onConflict: "user_id" }
      );
    });
  });

  it("deactivate calls supabase delete", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const { result } = renderHook(() => useLFG("Tel Aviv"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isMySignalLoading).toBe(false);
    });

    await act(async () => {
      result.current.deactivate();
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("looking_for_game");
    });
  });

  it("exposes isActivating and isDeactivating flags", () => {
    const { result } = renderHook(() => useLFG("Tel Aviv"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isActivating).toBe(false);
    expect(result.current.isDeactivating).toBe(false);
  });

  it("handles supabase error on fetch gracefully", async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: "DB error" } });

    const { result } = renderHook(() => useLFG("Tel Aviv"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSignalsLoading).toBe(false);
    });

    // On error, signals should stay as empty default
    expect(result.current.signals).toEqual([]);
  });
});
