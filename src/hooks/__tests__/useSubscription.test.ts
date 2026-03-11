/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { useSubscription } from "../useSubscription";
import { useAuthStore } from "@/store/authStore";
import type { ReactNode } from "react";
import { createElement } from "react";

// Mock toast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

// Mock supabase
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockUpsertSelect = vi.fn().mockReturnValue({ single: mockSingle });
const mockUpsert = vi.fn().mockReturnValue({ select: mockUpsertSelect });
const mockDeleteEq2 = vi.fn().mockResolvedValue({ error: null });
const mockDeleteEq = vi.fn().mockReturnValue({ eq: mockDeleteEq2 });

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  upsert: mockUpsert,
  delete: vi.fn().mockReturnValue({ eq: mockDeleteEq }),
};

const mockFrom = vi.fn().mockReturnValue(mockChain);

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useSubscription", () => {
  const initialAuthState = useAuthStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState(initialAuthState, true);
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.eq.mockResolvedValue({ data: [], error: null });
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockUpsertSelect.mockReturnValue({ single: mockSingle });
    mockUpsert.mockReturnValue({ select: mockUpsertSelect });
    mockDeleteEq.mockReturnValue({ eq: mockDeleteEq2 });
    mockDeleteEq2.mockResolvedValue({ error: null });
    mockChain.delete.mockReturnValue({ eq: mockDeleteEq });
  });

  afterEach(() => {
    useAuthStore.setState(initialAuthState, true);
  });

  // ── subscriptionsQuery ──

  it("returns empty subscriptions when no user", async () => {
    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscriptions).toEqual([]);
  });

  it("fetches user subscriptions when authenticated", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const mockSubs = [
      {
        id: 1,
        user_id: "user-1",
        target_type: "venue",
        target_id: "venue-1",
        format: null,
        city: null,
      },
      {
        id: 2,
        user_id: "user-1",
        target_type: "format",
        target_id: null,
        format: "pauper",
        city: "Tel Aviv",
      },
    ];

    // The chain ends at eq() which returns data
    mockChain.eq.mockResolvedValue({ data: mockSubs, error: null });

    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.subscriptions).toHaveLength(2);
    });

    expect(result.current.subscriptions).toEqual(mockSubs);
    expect(mockFrom).toHaveBeenCalledWith("subscriptions");
    expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("query is disabled when no user (enabled: !!user)", async () => {
    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscriptions).toEqual([]);
  });

  // ── subscribe ──

  it("subscribe upserts subscription with target_type, target_id, format, city", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const subscriptionData = {
      id: 3,
      user_id: "user-1",
      target_type: "venue",
      target_id: "venue-1",
      format: "pauper",
      city: "Tel Aviv",
    };
    mockSingle.mockResolvedValue({ data: subscriptionData, error: null });

    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.subscribe({
        targetType: "venue" as any,
        targetId: "venue-1",
        format: "pauper" as any,
        city: "Tel Aviv",
      });
    });

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: "user-1",
          target_type: "venue",
          target_id: "venue-1",
          format: "pauper",
          city: "Tel Aviv",
        },
        { onConflict: "user_id,target_type,target_id,format,city" }
      );
    });
  });

  it("subscribe uses null for optional params when not provided", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockSingle.mockResolvedValue({ data: { id: 4 }, error: null });

    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.subscribe({
        targetType: "venue" as any,
      });
    });

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: "user-1",
          target_type: "venue",
          target_id: null,
          format: null,
          city: null,
        },
        { onConflict: "user_id,target_type,target_id,format,city" }
      );
    });
  });

  // ── unsubscribe ──

  it("unsubscribe deletes subscription by id", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.unsubscribe(42);
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("subscriptions");
      expect(mockDeleteEq).toHaveBeenCalledWith("id", 42);
      expect(mockDeleteEq2).toHaveBeenCalledWith("user_id", "user-1");
    });
  });

  // ── Error handling ──

  it("subscribe shows toast on failure", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Constraint violation" },
    });

    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.subscribe({
        targetType: "venue" as any,
        targetId: "venue-1",
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Subscription failed",
        variant: "destructive",
      });
    });
  });

  it("unsubscribe shows toast on failure", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockDeleteEq2.mockResolvedValue({
      error: { message: "Delete failed" },
    });

    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.unsubscribe(99);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Unsubscribe failed",
        variant: "destructive",
      });
    });
  });

  // ── State flags ──

  it("isSubscribing is false initially", () => {
    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isSubscribing).toBe(false);
  });

  it("isLoading reflects query state", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockChain.eq.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  // ── Cache invalidation ──

  it("subscribe invalidates subscriptions query on settled", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockChain.eq.mockResolvedValue({ data: [], error: null });
    mockSingle.mockResolvedValue({ data: { id: 10 }, error: null });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useSubscription(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.subscribe({
        targetType: "venue" as any,
        targetId: "venue-1",
      });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["subscriptions", "user-1"],
      });
    });
  });

  it("unsubscribe invalidates subscriptions query on settled", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockChain.eq.mockResolvedValue({ data: [], error: null });
    mockDeleteEq2.mockResolvedValue({ error: null });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useSubscription(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.unsubscribe(42);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["subscriptions", "user-1"],
      });
    });
  });
});
