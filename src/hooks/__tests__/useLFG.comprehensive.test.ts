/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { useLFG } from "../useLFG";
import { useAuthStore } from "@/store/authStore";
import type { ReactNode } from "react";
import { createElement } from "react";

// --- Supabase mock chain ---
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

function setAuthUser(id = "user-1", email = "test@test.com") {
  useAuthStore.setState({
    user: { id, email } as any,
    profile: { city: "Tel Aviv", formats: ["pauper"] } as any,
    isAuthenticated: true,
    isLoading: false,
  });
}

describe("useLFG — comprehensive", () => {
  const initialAuthState = useAuthStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState(initialAuthState, true);
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.gt.mockReturnThis();
    mockChain.upsert.mockReturnThis();
    mockChain.delete.mockReturnValue({ eq: mockDeleteEq });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockSingle.mockResolvedValue({ data: { id: 1 }, error: null });
    mockDeleteEq.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    useAuthStore.setState(initialAuthState, true);
  });

  // ─── mySignalQuery ───

  describe("mySignalQuery", () => {
    it("returns null when user is not authenticated", async () => {
      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMySignalLoading).toBe(false);
      });

      expect(result.current.mySignal).toBeNull();
    });

    it("fetches user's active LFG signal from looking_for_game", async () => {
      setAuthUser();

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
        expect(result.current.mySignal).not.toBeNull();
      });

      expect(result.current.mySignal).toEqual(mySignal);
      expect(mockFrom).toHaveBeenCalledWith("looking_for_game");
    });

    it("queries with user_id filter and expires_at > now", async () => {
      setAuthUser("user-42");
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-42");
        expect(mockChain.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
      });
    });

    it("is disabled when no user (query not executed)", async () => {
      // no user set
      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      // isMySignalLoading should be false (disabled query)
      expect(result.current.isMySignalLoading).toBe(false);
      expect(result.current.mySignal).toBeNull();
    });
  });

  // ─── signalsQuery ───

  describe("signalsQuery", () => {
    it("fetches all active signals for the given city", async () => {
      const signals = [
        {
          id: 1,
          user_id: "other-user",
          city: "Tel Aviv",
          formats: ["pauper"],
          preferred_slot: "evening",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          created_at: "2026-03-01T10:00:00Z",
          profiles: { display_name: "Alice" },
        },
        {
          id: 2,
          user_id: "another-user",
          city: "Tel Aviv",
          formats: ["commander"],
          preferred_slot: null,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          created_at: "2026-03-02T10:00:00Z",
          profiles: { display_name: "Bob" },
        },
      ];

      mockOrder.mockResolvedValue({ data: signals, error: null });

      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSignalsLoading).toBe(false);
        expect(result.current.signals).toHaveLength(2);
      });

      expect(result.current.signals[0].profiles?.display_name).toBe("Alice");
      expect(result.current.signals[1].formats).toEqual(["commander"]);
    });

    it("returns empty array when city is undefined", async () => {
      const { result } = renderHook(() => useLFG(undefined), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSignalsLoading).toBe(false);
      });

      expect(result.current.signals).toEqual([]);
    });

    it("queries with city filter and expires_at > now and orders by created_at desc", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      renderHook(() => useLFG("Herzliya"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockChain.eq).toHaveBeenCalledWith("city", "Herzliya");
        expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
      });
    });

    it("includes profiles join via select", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockChain.select).toHaveBeenCalledWith(
          expect.stringContaining("profiles")
        );
      });
    });
  });

  // ─── activate ───

  describe("activate", () => {
    it("upserts LFG signal with correct params", async () => {
      setAuthUser();

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
          durationHours: 3,
        });
      });

      await waitFor(() => {
        expect(mockChain.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: "user-1",
            city: "Tel Aviv",
            formats: ["pauper", "commander"],
            preferred_slot: "evening",
            is_online: false,
          }),
          { onConflict: "user_id" }
        );
      });
    });

    it("uses default durationHours=4 when not specified", async () => {
      setAuthUser();

      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMySignalLoading).toBe(false);
      });

      const beforeTime = Date.now();

      await act(async () => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["pauper"],
        });
      });

      await waitFor(() => {
        expect(mockChain.upsert).toHaveBeenCalled();
      });

      const upsertCall = mockChain.upsert.mock.calls[0][0];
      const expiresAt = new Date(upsertCall.expires_at).getTime();
      // Default 4 hours = 14400000ms
      expect(expiresAt).toBeGreaterThanOrEqual(beforeTime + 4 * 3600000 - 1000);
      expect(expiresAt).toBeLessThanOrEqual(beforeTime + 4 * 3600000 + 5000);
    });

    it("calculates expires_at from durationHours", async () => {
      setAuthUser();

      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMySignalLoading).toBe(false);
      });

      const beforeTime = Date.now();

      await act(async () => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["draft"],
          durationHours: 2,
        });
      });

      await waitFor(() => {
        expect(mockChain.upsert).toHaveBeenCalled();
      });

      const upsertCall = mockChain.upsert.mock.calls[0][0];
      const expiresAt = new Date(upsertCall.expires_at).getTime();
      // 2 hours = 7200000ms
      expect(expiresAt).toBeGreaterThanOrEqual(beforeTime + 2 * 3600000 - 1000);
      expect(expiresAt).toBeLessThanOrEqual(beforeTime + 2 * 3600000 + 5000);
    });

    it("sets city to 'Online' when is_online is true", async () => {
      setAuthUser();

      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMySignalLoading).toBe(false);
      });

      await act(async () => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["commander"],
          is_online: true,
        });
      });

      await waitFor(() => {
        expect(mockChain.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            city: "Online",
            is_online: true,
          }),
          { onConflict: "user_id" }
        );
      });
    });

    it("keeps original city when is_online is false", async () => {
      setAuthUser();

      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMySignalLoading).toBe(false);
      });

      await act(async () => {
        result.current.activate({
          city: "Herzliya",
          formats: ["standard"],
          is_online: false,
        });
      });

      await waitFor(() => {
        expect(mockChain.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            city: "Herzliya",
            is_online: false,
          }),
          { onConflict: "user_id" }
        );
      });
    });

    it("sets preferred_slot to null when not provided", async () => {
      setAuthUser();

      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMySignalLoading).toBe(false);
      });

      await act(async () => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["pauper"],
        });
      });

      await waitFor(() => {
        expect(mockChain.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            preferred_slot: null,
          }),
          { onConflict: "user_id" }
        );
      });
    });

    it("throws error when user is not authenticated", async () => {
      // No user set
      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["pauper"],
        });
      });

      // The mutation should fail and trigger toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" })
        );
      });
    });

    it("shows destructive toast on supabase error", async () => {
      setAuthUser();
      mockSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMySignalLoading).toBe(false);
      });

      await act(async () => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["pauper"],
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

    it("sets isActivating to true while mutation is pending", async () => {
      setAuthUser();

      // Make upsert chain hang by never resolving
      let resolveSingle: (value: any) => void;
      const singlePromise = new Promise((resolve) => {
        resolveSingle = resolve;
      });
      mockSingle.mockReturnValue(singlePromise);

      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMySignalLoading).toBe(false);
      });

      act(() => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["pauper"],
        });
      });

      await waitFor(() => {
        expect(result.current.isActivating).toBe(true);
      });

      // Resolve
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
    it("deletes LFG signal by user_id", async () => {
      setAuthUser();

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
        expect(mockDeleteEq).toHaveBeenCalledWith("user_id", "user-1");
      });
    });

    it("throws error when user is not authenticated", async () => {
      const { result } = renderHook(() => useLFG("Tel Aviv"), {
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

    it("shows destructive toast on supabase error during delete", async () => {
      setAuthUser();
      mockDeleteEq.mockResolvedValue({ error: { message: "Delete failed" } });

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
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Something went wrong",
            variant: "destructive",
          })
        );
      });
    });

    it("sets isDeactivating to true while mutation is pending", async () => {
      setAuthUser();

      let resolveDelete: (value: any) => void;
      const deletePromise = new Promise((resolve) => {
        resolveDelete = resolve;
      });
      mockDeleteEq.mockReturnValue(deletePromise);

      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMySignalLoading).toBe(false);
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
    it("invalidates lfg-my, lfg-signals, and lfg-count queries on activate success", async () => {
      setAuthUser();

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useLFG("Tel Aviv"), { wrapper });

      await waitFor(() => {
        expect(result.current.isMySignalLoading).toBe(false);
      });

      await act(async () => {
        result.current.activate({
          city: "Tel Aviv",
          formats: ["pauper"],
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-my", "user-1"] })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-signals"] })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-count"] })
        );
      });
    });

    it("invalidates lfg-my, lfg-signals, and lfg-count queries on deactivate success", async () => {
      setAuthUser();

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useLFG("Tel Aviv"), { wrapper });

      await waitFor(() => {
        expect(result.current.isMySignalLoading).toBe(false);
      });

      await act(async () => {
        result.current.deactivate();
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-my", "user-1"] })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-signals"] })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["lfg-count"] })
        );
      });
    });
  });

  // ─── Error handling ───

  describe("error handling", () => {
    it("handles supabase error on signalsQuery gracefully", async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSignalsLoading).toBe(false);
      });

      expect(result.current.signals).toEqual([]);
    });

    it("handles supabase error on mySignalQuery gracefully", async () => {
      setAuthUser();
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "Auth error" } });

      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMySignalLoading).toBe(false);
      });

      expect(result.current.mySignal).toBeNull();
    });
  });

  // ─── Realtime subscription ───

  describe("realtime subscription", () => {
    it("sets up realtime subscription with city filter", async () => {
      const { useRealtimeSubscription } = await import("@/hooks/useRealtimeSubscription");

      renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      expect(useRealtimeSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          channelName: "lfg:Tel Aviv",
          table: "looking_for_game",
          filter: "city=eq.Tel Aviv",
          enabled: true,
        })
      );
    });

    it("disables realtime subscription when city is undefined", async () => {
      const { useRealtimeSubscription } = await import("@/hooks/useRealtimeSubscription");

      renderHook(() => useLFG(undefined), {
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
      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty("mySignal");
      expect(result.current).toHaveProperty("isMySignalLoading");
      expect(result.current).toHaveProperty("signals");
      expect(result.current).toHaveProperty("isSignalsLoading");
      expect(result.current).toHaveProperty("activate");
      expect(result.current).toHaveProperty("deactivate");
      expect(result.current).toHaveProperty("isActivating");
      expect(result.current).toHaveProperty("isDeactivating");
    });

    it("defaults mySignal to null and signals to empty array", () => {
      const { result } = renderHook(() => useLFG("Tel Aviv"), {
        wrapper: createWrapper(),
      });

      expect(result.current.mySignal).toBeNull();
      expect(result.current.signals).toEqual([]);
      expect(result.current.isActivating).toBe(false);
      expect(result.current.isDeactivating).toBe(false);
    });
  });
});
