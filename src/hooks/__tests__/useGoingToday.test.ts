/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { useGoingToday } from "../useGoingToday";
import { useAuthStore } from "@/store/authStore";
import type { ReactNode } from "react";
import { createElement } from "react";

// --- Supabase mock chain ---
// The hook has 3 queries with different terminal calls:
//   instantCountQuery: .select("*", {count,head}).eq().eq().gt()  -- gt() is terminal, resolves {count,error}
//   instantSignalsQuery: .select("*,...").eq().eq().gt().order()   -- order() is terminal, resolves {data,error}
//   myInstantQuery: .select("*").eq().eq().gt().maybeSingle()     -- maybeSingle() is terminal, resolves {data,error}
//
// We use a single chain where gt() returns `this`, but make the chain itself
// "thenable" so that when the count query awaits the chain at gt(), it resolves.

const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
const mockSingle = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });

// Count resolution for thenable behavior
let countResolution = { count: 0, error: null as any };

const mockChain: any = {
  select: vi.fn(),
  eq: vi.fn(),
  gt: vi.fn(),
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
  upsert: vi.fn(),
  single: mockSingle,
  delete: vi.fn().mockReturnValue({ eq: mockDeleteEq }),
  // Make chain thenable: when awaited directly (count query), resolve with count
  then(onFulfilled: any, onRejected?: any) {
    return Promise.resolve(countResolution).then(onFulfilled, onRejected);
  },
};

// Chain returns itself for non-terminal calls
mockChain.select.mockReturnValue(mockChain);
mockChain.eq.mockReturnValue(mockChain);
mockChain.gt.mockReturnValue(mockChain);
mockChain.upsert.mockReturnValue(mockChain);

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

vi.mock("@/hooks/useRealtimeSubscription", () => ({
  useRealtimeSubscription: vi.fn(),
}));

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function setAuthUser(id = "user-1") {
  useAuthStore.setState({
    user: { id, email: "test@test.com" } as any,
    profile: { city: "Tel Aviv", formats: ["pauper"] } as any,
    isAuthenticated: true,
    isLoading: false,
  });
}

describe("useGoingToday", () => {
  const initialAuthState = useAuthStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState(initialAuthState, true);
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.gt.mockReturnValue(mockChain);
    mockChain.upsert.mockReturnValue(mockChain);
    mockChain.delete.mockReturnValue({ eq: mockDeleteEq });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockSingle.mockResolvedValue({ data: { id: 1 }, error: null });
    mockDeleteEq.mockResolvedValue({ error: null });
    countResolution = { count: 0, error: null };
  });

  afterEach(() => {
    useAuthStore.setState(initialAuthState, true);
  });

  // ─── instantCountQuery ───

  describe("instantCountQuery", () => {
    it("returns 0 when city is undefined", async () => {
      const { result } = renderHook(() => useGoingToday(undefined), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.instantCount).toBe(0);
      });
    });

    it("fetches count of instant LFG signals in the city", async () => {
      countResolution = { count: 5, error: null };

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.instantCount).toBe(5);
      });
    });

    it("queries with city and is_instant=true filter", async () => {
      renderHook(() => useGoingToday("Herzliya"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("looking_for_game");
        expect(mockChain.eq).toHaveBeenCalledWith("city", "Herzliya");
        expect(mockChain.eq).toHaveBeenCalledWith("is_instant", true);
      });
    });

    it("returns 0 when supabase returns error", async () => {
      countResolution = { count: null as any, error: { message: "DB error" } };

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.instantCount).toBe(0);
      });
    });
  });

  // ─── instantSignalsQuery ───

  describe("instantSignalsQuery", () => {
    it("fetches all instant signals with profiles for the city", async () => {
      const signals = [
        {
          id: 10,
          user_id: "user-a",
          city: "Tel Aviv",
          formats: ["commander"],
          duration_hours: 2,
          is_instant: true,
          expires_at: new Date(Date.now() + 7200000).toISOString(),
          created_at: "2026-03-10T10:00:00Z",
          profiles: { display_name: "Alice" },
        },
        {
          id: 11,
          user_id: "user-b",
          city: "Tel Aviv",
          formats: ["pauper", "draft"],
          duration_hours: 3,
          is_instant: true,
          expires_at: new Date(Date.now() + 10800000).toISOString(),
          created_at: "2026-03-10T11:00:00Z",
          profiles: { display_name: "Bob" },
        },
      ];

      mockOrder.mockResolvedValue({ data: signals, error: null });

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.instantSignals).toHaveLength(2);
      });

      expect(result.current.instantSignals[0].profiles?.display_name).toBe("Alice");
      expect(result.current.instantSignals[1].duration_hours).toBe(3);
    });

    it("returns empty array when city is undefined", async () => {
      const { result } = renderHook(() => useGoingToday(undefined), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.instantSignals).toEqual([]);
      });
    });

    it("returns empty array on supabase error", async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.instantSignals).toEqual([]);
      });
    });

    it("includes profiles join and orders by created_at desc", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockChain.select).toHaveBeenCalledWith(
          expect.stringContaining("profiles")
        );
        expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
      });
    });
  });

  // ─── myInstantQuery ───

  describe("myInstantQuery", () => {
    it("returns null when user is not authenticated", async () => {
      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      expect(result.current.myInstant).toBeNull();
      expect(result.current.isMyInstantLoading).toBe(false);
    });

    it("fetches current user's instant signal", async () => {
      setAuthUser();

      const myInstant = {
        id: 20,
        user_id: "user-1",
        city: "Tel Aviv",
        formats: ["pauper"],
        duration_hours: 2,
        is_instant: true,
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        created_at: "2026-03-10T14:00:00Z",
      };

      mockMaybeSingle.mockResolvedValue({ data: myInstant, error: null });

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.myInstant).not.toBeNull();
      });

      expect(result.current.myInstant).toEqual(myInstant);
    });

    it("filters by user_id, is_instant=true, and expires_at", async () => {
      setAuthUser("user-42");
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-42");
        expect(mockChain.eq).toHaveBeenCalledWith("is_instant", true);
        expect(mockChain.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
      });
    });

    it("handles supabase error gracefully", async () => {
      setAuthUser();
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "Auth error" } });

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMyInstantLoading).toBe(false);
      });

      expect(result.current.myInstant).toBeNull();
    });
  });

  // ─── activate ───

  describe("activate", () => {
    it("upserts instant LFG signal with is_instant=true", async () => {
      setAuthUser();

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMyInstantLoading).toBe(false);
      });

      await act(async () => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["commander"],
          duration_hours: 3,
        });
      });

      await waitFor(() => {
        expect(mockChain.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: "user-1",
            city: "Tel Aviv",
            formats: ["commander"],
            is_instant: true,
            duration_hours: 3,
          }),
          { onConflict: "user_id" }
        );
      });
    });

    it("calculates expires_at from duration_hours", async () => {
      setAuthUser();

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMyInstantLoading).toBe(false);
      });

      const beforeTime = Date.now();

      await act(async () => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["pauper"],
          duration_hours: 2,
        });
      });

      await waitFor(() => {
        expect(mockChain.upsert).toHaveBeenCalled();
      });

      const upsertCall = mockChain.upsert.mock.calls[0][0];
      const expiresAt = new Date(upsertCall.expires_at).getTime();
      expect(expiresAt).toBeGreaterThanOrEqual(beforeTime + 2 * 3600000 - 1000);
      expect(expiresAt).toBeLessThanOrEqual(beforeTime + 2 * 3600000 + 5000);
    });

    it("throws when user is not authenticated", async () => {
      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["pauper"],
          duration_hours: 1,
        });
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" })
        );
      });
    });

    it("shows destructive toast on supabase error", async () => {
      setAuthUser();
      mockSingle.mockResolvedValue({ data: null, error: { message: "Upsert failed" } });

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMyInstantLoading).toBe(false);
      });

      await act(async () => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["draft"],
          duration_hours: 2,
        });
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Something went wrong",
            variant: "destructive",
          })
        );
      });
    });

    it("sets isActivating flag during pending mutation", async () => {
      setAuthUser();

      let resolveSingle: (value: any) => void;
      const singlePromise = new Promise((resolve) => {
        resolveSingle = resolve;
      });
      mockSingle.mockReturnValue(singlePromise);

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMyInstantLoading).toBe(false);
      });

      act(() => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["pauper"],
          duration_hours: 1,
        });
      });

      await waitFor(() => {
        expect(result.current.isActivating).toBe(true);
      });

      await act(async () => {
        resolveSingle!({ data: { id: 1 }, error: null });
      });

      await waitFor(() => {
        expect(result.current.isActivating).toBe(false);
      });
    });
  });

  // ─── deactivate ───

  describe("deactivate", () => {
    it("deletes signal by user_id", async () => {
      setAuthUser();

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMyInstantLoading).toBe(false);
      });

      await act(async () => {
        result.current.deactivate();
      });

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("looking_for_game");
        expect(mockDeleteEq).toHaveBeenCalledWith("user_id", "user-1");
      });
    });

    it("throws when user is not authenticated", async () => {
      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.deactivate();
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" })
        );
      });
    });

    it("shows destructive toast on supabase delete error", async () => {
      setAuthUser();
      mockDeleteEq.mockResolvedValue({ error: { message: "Delete failed" } });

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMyInstantLoading).toBe(false);
      });

      await act(async () => {
        result.current.deactivate();
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Something went wrong",
            variant: "destructive",
          })
        );
      });
    });

    it("sets isDeactivating flag during pending mutation", async () => {
      setAuthUser();

      let resolveDelete: (value: any) => void;
      const deletePromise = new Promise((resolve) => {
        resolveDelete = resolve;
      });
      mockDeleteEq.mockReturnValue(deletePromise);

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMyInstantLoading).toBe(false);
      });

      act(() => {
        result.current.deactivate();
      });

      await waitFor(() => {
        expect(result.current.isDeactivating).toBe(true);
      });

      await act(async () => {
        resolveDelete!({ error: null });
      });

      await waitFor(() => {
        expect(result.current.isDeactivating).toBe(false);
      });
    });
  });

  // ─── Cache invalidation ───

  describe("cache invalidation", () => {
    it("invalidates all related queries on activate settled", async () => {
      setAuthUser();

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), { wrapper });

      await waitFor(() => {
        expect(result.current.isMyInstantLoading).toBe(false);
      });

      await act(async () => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["pauper"],
          duration_hours: 2,
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-my-instant", "user-1"] })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-my", "user-1"] })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-instant-count"] })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-instant-signals"] })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-signals"] })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-count"] })
        );
      });
    });

    it("invalidates all related queries on deactivate settled", async () => {
      setAuthUser();

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useGoingToday("Tel Aviv"), { wrapper });

      await waitFor(() => {
        expect(result.current.isMyInstantLoading).toBe(false);
      });

      await act(async () => {
        result.current.deactivate();
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-my-instant", "user-1"] })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-my", "user-1"] })
        );
      });
    });
  });

  // ─── Realtime subscription ───

  describe("realtime subscription", () => {
    it("sets up realtime subscription with city filter", async () => {
      const { useRealtimeSubscription } = await import("@/hooks/useRealtimeSubscription");

      renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      expect(useRealtimeSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          channelName: "lfg-instant:Tel Aviv",
          table: "looking_for_game",
          filter: "city=eq.Tel Aviv",
          enabled: true,
        })
      );
    });

    it("disables realtime subscription when city is undefined", async () => {
      const { useRealtimeSubscription } = await import("@/hooks/useRealtimeSubscription");

      renderHook(() => useGoingToday(undefined), {
        wrapper: createWrapper(),
      });

      expect(useRealtimeSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });
  });

  // ─── Return shape ───

  describe("return shape", () => {
    it("exposes all expected properties", () => {
      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty("instantCount");
      expect(result.current).toHaveProperty("instantSignals");
      expect(result.current).toHaveProperty("myInstant");
      expect(result.current).toHaveProperty("isMyInstantLoading");
      expect(result.current).toHaveProperty("activate");
      expect(result.current).toHaveProperty("deactivate");
      expect(result.current).toHaveProperty("isActivating");
      expect(result.current).toHaveProperty("isDeactivating");
    });

    it("defaults instantCount to 0, instantSignals to [], myInstant to null", () => {
      const { result } = renderHook(() => useGoingToday("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      expect(result.current.instantCount).toBe(0);
      expect(result.current.instantSignals).toEqual([]);
      expect(result.current.myInstant).toBeNull();
      expect(result.current.isActivating).toBe(false);
      expect(result.current.isDeactivating).toBe(false);
    });
  });
});
