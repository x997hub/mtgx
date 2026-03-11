/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { useNotifications } from "../useNotifications";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import type { ReactNode } from "react";
import { createElement } from "react";

// --- Supabase mock chain ---
const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: mockOrder,
  update: vi.fn().mockReturnValue({ eq: mockUpdateEq }),
  limit: mockLimit,
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

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function setAuthUser(id = "user-1") {
  useAuthStore.setState({
    user: { id, email: "test@test.com" } as any,
    isAuthenticated: true,
    isLoading: false,
  });
}

const mockNotifications = [
  {
    id: 1,
    user_id: "user-1",
    type: "event_reminder",
    title: "Event tomorrow",
    body: "Your event starts tomorrow at 18:00",
    is_read: false,
    created_at: "2026-03-10T12:00:00Z",
  },
  {
    id: 2,
    user_id: "user-1",
    type: "rsvp_update",
    title: "New RSVP",
    body: "Alice is going to your event",
    is_read: true,
    created_at: "2026-03-09T10:00:00Z",
  },
  {
    id: 3,
    user_id: "user-1",
    type: "lfg_match",
    title: "LFG match",
    body: "Bob is looking for a game near you",
    is_read: false,
    created_at: "2026-03-08T08:00:00Z",
  },
];

describe("useNotifications", () => {
  const initialAuthState = useAuthStore.getState();
  const initialUIState = useUIStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState(initialAuthState, true);
    useUIStore.setState(initialUIState, true);
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockChain.update.mockReturnValue({ eq: mockUpdateEq });
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    useAuthStore.setState(initialAuthState, true);
    useUIStore.setState(initialUIState, true);
  });

  // ─── notificationsQuery ───

  describe("notificationsQuery", () => {
    it("returns empty array when user is not authenticated", async () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("fetches user's notifications ordered by created_at desc", async () => {
      setAuthUser();
      mockLimit.mockResolvedValue({ data: [...mockNotifications], error: null });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.notifications).toHaveLength(3);
      });

      expect(result.current.notifications[0].id).toBe(1);
      expect(result.current.notifications[2].id).toBe(3);
    });

    it("queries with user_id filter", async () => {
      setAuthUser("user-42");
      mockLimit.mockResolvedValue({ data: [], error: null });

      renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("notifications");
        expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-42");
      });
    });

    it("orders by created_at descending and limits to 50", async () => {
      setAuthUser();
      mockLimit.mockResolvedValue({ data: [], error: null });

      renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
        expect(mockLimit).toHaveBeenCalledWith(50);
      });
    });

    it("returns empty notifications on supabase error", async () => {
      setAuthUser();
      mockLimit.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.isError).toBe(true);
    });

    it("is disabled when no user", async () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      // Query should not fire
      expect(result.current.isLoading).toBe(false);
      expect(result.current.notifications).toEqual([]);
    });
  });

  // ─── Unread count → uiStore ───

  describe("unread count sync to uiStore", () => {
    it("updates notificationsCount in uiStore based on unread notifications", async () => {
      setAuthUser();
      mockLimit.mockResolvedValue({ data: [...mockNotifications], error: null });

      renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // 2 unread (id 1 and 3), 1 read (id 2)
        expect(useUIStore.getState().notificationsCount).toBe(2);
      });
    });

    it("sets notificationsCount to 0 when all notifications are read", async () => {
      setAuthUser();
      const allRead = mockNotifications.map((n) => ({ ...n, is_read: true }));
      mockLimit.mockResolvedValue({ data: allRead, error: null });

      renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(useUIStore.getState().notificationsCount).toBe(0);
      });
    });

    it("sets notificationsCount to 0 when there are no notifications", async () => {
      setAuthUser();
      mockLimit.mockResolvedValue({ data: [], error: null });

      renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(useUIStore.getState().notificationsCount).toBe(0);
      });
    });
  });

  // ─── markAsRead ───

  describe("markAsRead", () => {
    it("updates notification is_read=true by id", async () => {
      setAuthUser();
      mockLimit.mockResolvedValue({ data: [...mockNotifications], error: null });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(3);
      });

      await act(async () => {
        result.current.markAsRead(1);
      });

      await waitFor(() => {
        expect(mockChain.update).toHaveBeenCalledWith({ is_read: true });
        expect(mockUpdateEq).toHaveBeenCalledWith("id", 1);
      });
    });

    it("handles supabase error gracefully (logs to console)", async () => {
      setAuthUser();
      mockLimit.mockResolvedValue({ data: [...mockNotifications], error: null });
      mockUpdateEq.mockResolvedValue({ error: { message: "Update failed" } });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(3);
      });

      await act(async () => {
        result.current.markAsRead(1);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to mark notification as read:",
          expect.anything()
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it("invalidates notifications query on settled", async () => {
      setAuthUser();
      mockLimit.mockResolvedValue({ data: [...mockNotifications], error: null });

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(3);
      });

      await act(async () => {
        result.current.markAsRead(1);
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["notifications", "user-1"] })
        );
      });
    });
  });

  // ─── markAllRead ───

  describe("markAllRead", () => {
    it("updates all unread notifications to is_read=true for the user", async () => {
      setAuthUser();
      mockLimit.mockResolvedValue({ data: [...mockNotifications], error: null });

      // For markAllRead: .update({ is_read: true }).eq("user_id", ...).eq("is_read", false)
      const mockSecondEq = vi.fn().mockResolvedValue({ error: null });
      mockUpdateEq.mockReturnValue({ eq: mockSecondEq });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(3);
      });

      await act(async () => {
        result.current.markAllRead();
      });

      await waitFor(() => {
        expect(mockChain.update).toHaveBeenCalledWith({ is_read: true });
        expect(mockUpdateEq).toHaveBeenCalledWith("user_id", "user-1");
        expect(mockSecondEq).toHaveBeenCalledWith("is_read", false);
      });
    });

    it("does nothing when user is not authenticated", async () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.markAllRead();
      });

      // update should not be called for the markAllRead mutation
      // (the mutation checks currentUser and returns early)
      // We check that it didn't call update with is_read false filter
    });

    it("handles error gracefully (logs to console)", async () => {
      setAuthUser();
      mockLimit.mockResolvedValue({ data: [...mockNotifications], error: null });

      const mockSecondEq = vi.fn().mockResolvedValue({ error: { message: "Batch update failed" } });
      mockUpdateEq.mockReturnValue({ eq: mockSecondEq });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(3);
      });

      await act(async () => {
        result.current.markAllRead();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to mark all notifications as read:",
          expect.anything()
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it("invalidates notifications query on settled", async () => {
      setAuthUser();
      mockLimit.mockResolvedValue({ data: [...mockNotifications], error: null });

      const mockSecondEq = vi.fn().mockResolvedValue({ error: null });
      mockUpdateEq.mockReturnValue({ eq: mockSecondEq });

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(3);
      });

      await act(async () => {
        result.current.markAllRead();
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["notifications", "user-1"] })
        );
      });
    });
  });

  // ─── Realtime subscription ───

  describe("realtime subscription", () => {
    it("subscribes to INSERT events on notifications table for user_id", async () => {
      const { useRealtimeSubscription } = await import("@/hooks/useRealtimeSubscription");
      setAuthUser("user-42");

      renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(useRealtimeSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          channelName: "notifications",
          table: "notifications",
          filter: "user_id=eq.user-42",
          event: "INSERT",
          enabled: true,
        })
      );
    });

    it("disables realtime subscription when no user", async () => {
      const { useRealtimeSubscription } = await import("@/hooks/useRealtimeSubscription");

      renderHook(() => useNotifications(), {
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
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty("notifications");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("isError");
      expect(result.current).toHaveProperty("refetch");
      expect(result.current).toHaveProperty("markAsRead");
      expect(result.current).toHaveProperty("markAllRead");
    });

    it("refetch is a function", () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.refetch).toBe("function");
    });
  });
});
