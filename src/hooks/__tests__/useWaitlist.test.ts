/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { useWaitlist } from "../useWaitlist";
import { useAuthStore } from "@/store/authStore";
import type { ReactNode } from "react";
import { createElement } from "react";

// Mock supabase
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: mockMaybeSingle,
};

const mockFrom = vi.fn().mockReturnValue(mockChain);

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
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

describe("useWaitlist", () => {
  const initialAuthState = useAuthStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState(initialAuthState, true);
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    useAuthStore.setState(initialAuthState, true);
  });

  // ── waitlistQuery ──

  it("returns null position and isWaitlisted=false when no user", async () => {
    const { result } = renderHook(() => useWaitlist("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.position).toBeNull();
    expect(result.current.isWaitlisted).toBe(false);
  });

  it("fetches user's waitlist position from rsvps", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const waitlistEntry = { queue_position: 3, status: "waitlisted" };
    mockMaybeSingle.mockResolvedValue({ data: waitlistEntry, error: null });

    const { result } = renderHook(() => useWaitlist("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.position).toBe(3);
    });

    expect(result.current.isWaitlisted).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("rsvps");
    expect(mockChain.select).toHaveBeenCalledWith("queue_position, status");
    expect(mockChain.eq).toHaveBeenCalledWith("event_id", "event-1");
    expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockChain.eq).toHaveBeenCalledWith("status", "waitlisted");
  });

  it("returns queue_position for waitlisted status", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockMaybeSingle.mockResolvedValue({
      data: { queue_position: 5, status: "waitlisted" },
      error: null,
    });

    const { result } = renderHook(() => useWaitlist("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.position).toBe(5);
    });

    expect(result.current.isWaitlisted).toBe(true);
  });

  it("returns null position when not on waitlist", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useWaitlist("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.position).toBeNull();
    expect(result.current.isWaitlisted).toBe(false);
  });

  it("query is disabled when eventId is empty", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const { result } = renderHook(() => useWaitlist(""), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should not have called from() for the query since eventId is empty
    expect(result.current.position).toBeNull();
  });

  // ── joinWaitlist ──

  it("joinWaitlist calls RPC join_waitlist with event_id and user_id", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const rpcResult = { status: "waitlisted", queue_position: 7 };
    mockRpc.mockResolvedValue({ data: rpcResult, error: null });

    const { result } = renderHook(() => useWaitlist("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let joinResult: any;
    await act(async () => {
      joinResult = await result.current.joinWaitlist();
    });

    expect(mockRpc).toHaveBeenCalledWith("join_waitlist", {
      p_event_id: "event-1",
      p_user_id: "user-1",
    });
    expect(joinResult).toEqual(rpcResult);
  });

  it("joinWaitlist throws when user is not authenticated", async () => {
    // user is null by default
    const { result } = renderHook(() => useWaitlist("event-1"), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.joinWaitlist();
      })
    ).rejects.toThrow("Not authenticated");
  });

  // ── Error handling ──

  it("handles supabase error on fetch gracefully", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const { result } = renderHook(() => useWaitlist("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // On error, position should stay null
    expect(result.current.position).toBeNull();
    expect(result.current.isWaitlisted).toBe(false);
  });

  it("handles RPC error on joinWaitlist", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Event is full" },
    });

    const { result } = renderHook(() => useWaitlist("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.joinWaitlist();
      })
    ).rejects.toThrow();
  });

  // ── State flags ──

  it("exposes isJoining flag initially false", () => {
    const { result } = renderHook(() => useWaitlist("event-1"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isJoining).toBe(false);
  });

  it("isLoading is false when query settles", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useWaitlist("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
