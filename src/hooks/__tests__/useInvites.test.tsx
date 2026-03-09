/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor } from "@testing-library/react";
import { useInvites } from "../useInvites";
import { useAuthStore } from "@/store/authStore";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { InviteWithRelations } from "../useInvites";

// Set up mocks for supabase
const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
const mockIn = vi.fn().mockResolvedValue({ data: [], error: null });
const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: mockOrder,
  in: mockIn,
};
const mockFrom = vi.fn().mockReturnValue(mockChain);

const mockChannelOn = vi.fn().mockReturnThis();
const mockChannelSubscribe = vi.fn().mockReturnThis();
const mockChannelUnsubscribe = vi.fn();
const mockChannelObj = { on: mockChannelOn, subscribe: mockChannelSubscribe, unsubscribe: mockChannelUnsubscribe };
const mockChannel = vi.fn().mockReturnValue(mockChannelObj);
const mockRemoveChannel = vi.fn();

const mockGetSession = vi.fn().mockResolvedValue({
  data: { session: { access_token: "mock-token" } },
  error: null,
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

const mockIncomingInvites: InviteWithRelations[] = [
  {
    id: 1,
    from_user_id: "sender-1",
    to_user_id: "user-1",
    event_id: "event-1",
    format: "pauper",
    message: "Want to play?",
    proposed_time: null,
    status: "pending",
    created_at: "2026-03-01T10:00:00Z",
    responded_at: null,
  },
  {
    id: 2,
    from_user_id: "sender-2",
    to_user_id: "user-1",
    event_id: null,
    format: "commander",
    message: null,
    proposed_time: null,
    status: "accepted",
    created_at: "2026-02-28T10:00:00Z",
    responded_at: "2026-02-28T12:00:00Z",
  },
  {
    id: 3,
    from_user_id: "sender-3",
    to_user_id: "user-1",
    event_id: null,
    format: null,
    message: "Game tonight?",
    proposed_time: "2026-03-06T20:00:00Z",
    status: "pending",
    created_at: "2026-03-05T08:00:00Z",
    responded_at: null,
  },
];

const mockOutgoingInvites: InviteWithRelations[] = [
  {
    id: 10,
    from_user_id: "user-1",
    to_user_id: "receiver-1",
    event_id: null,
    format: "draft",
    message: "Draft tonight?",
    proposed_time: null,
    status: "pending",
    created_at: "2026-03-04T14:00:00Z",
    responded_at: null,
  },
];

const mockSenderProfiles = [
  { id: "sender-1", display_name: "Sender One", avatar_url: null },
  { id: "sender-2", display_name: "Sender Two", avatar_url: "https://example.com/avatar.jpg" },
  { id: "sender-3", display_name: "Sender Three", avatar_url: null },
];

const mockReceiverProfiles = [
  { id: "receiver-1", display_name: "Receiver One", avatar_url: null },
];

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useInvites", () => {
  const initialAuthState = useAuthStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish defaults
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockIn.mockResolvedValue({ data: [], error: null });
    mockChannel.mockReturnValue(mockChannelObj);
    mockChannelOn.mockReturnThis();
    mockChannelSubscribe.mockReturnThis();
    useAuthStore.setState(initialAuthState, true);
  });

  afterEach(() => {
    useAuthStore.setState(initialAuthState, true);
  });

  it("returns empty arrays when user is not authenticated", async () => {
    const { result } = renderHook(() => useInvites(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.incoming).toEqual([]);
    expect(result.current.outgoing).toEqual([]);
    expect(result.current.pendingCount).toBe(0);
  });

  it("fetches incoming and outgoing invites when user is authenticated", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    // Use eq() field name to differentiate incoming vs outgoing queries
    mockFrom.mockImplementation((table: string) => {
      if (table === "player_invites") {
        const inviteChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((field: string) => {
            const orderMock = vi.fn();
            if (field === "to_user_id") {
              orderMock.mockResolvedValue({ data: [...mockIncomingInvites], error: null });
            } else {
              orderMock.mockResolvedValue({ data: [...mockOutgoingInvites], error: null });
            }
            return { order: orderMock };
          }),
        };
        return inviteChain;
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [...mockSenderProfiles, ...mockReceiverProfiles], error: null }),
        };
      }
      return mockChain;
    });

    const { result } = renderHook(() => useInvites(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.incoming.length).toBeGreaterThan(0);
    });

    expect(result.current.incoming).toHaveLength(3);
    expect(result.current.outgoing).toHaveLength(1);
  });

  it("calculates pendingCount correctly from incoming invites", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    let fromCallIndex = 0;
    mockFrom.mockImplementation((table: string) => {
      fromCallIndex++;
      if (table === "player_invites") {
        const inviteChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn(),
        };
        if (fromCallIndex <= 2) {
          inviteChain.order.mockResolvedValue({ data: [...mockIncomingInvites], error: null });
        } else {
          inviteChain.order.mockResolvedValue({ data: [], error: null });
        }
        return inviteChain;
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: mockSenderProfiles, error: null }),
        };
      }
      return mockChain;
    });

    const { result } = renderHook(() => useInvites(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.incoming.length).toBeGreaterThan(0);
    });

    // mockIncomingInvites has 2 pending (id:1, id:3) and 1 accepted (id:2)
    expect(result.current.pendingCount).toBe(2);
  });

  it("returns 0 pendingCount when all invites are responded to", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const respondedInvites: InviteWithRelations[] = [
      {
        id: 1,
        from_user_id: "sender-1",
        to_user_id: "user-1",
        event_id: null,
        format: "pauper",
        message: null,
        proposed_time: null,
        status: "accepted",
        created_at: "2026-03-01T10:00:00Z",
        responded_at: "2026-03-01T12:00:00Z",
      },
      {
        id: 2,
        from_user_id: "sender-2",
        to_user_id: "user-1",
        event_id: null,
        format: null,
        message: null,
        proposed_time: null,
        status: "declined",
        created_at: "2026-02-28T10:00:00Z",
        responded_at: "2026-02-28T11:00:00Z",
      },
    ];

    let fromCallIndex = 0;
    mockFrom.mockImplementation((table: string) => {
      fromCallIndex++;
      if (table === "player_invites") {
        const inviteChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn(),
        };
        if (fromCallIndex <= 2) {
          inviteChain.order.mockResolvedValue({ data: [...respondedInvites], error: null });
        } else {
          inviteChain.order.mockResolvedValue({ data: [], error: null });
        }
        return inviteChain;
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { id: "sender-1", display_name: "S1", avatar_url: null },
              { id: "sender-2", display_name: "S2", avatar_url: null },
            ],
            error: null,
          }),
        };
      }
      return mockChain;
    });

    const { result } = renderHook(() => useInvites(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.incoming.length).toBeGreaterThan(0);
    });

    expect(result.current.pendingCount).toBe(0);
  });

  it("exposes sendInvite and respondInvite functions", () => {
    const { result } = renderHook(() => useInvites(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.sendInvite).toBe("function");
    expect(typeof result.current.respondInvite).toBe("function");
  });

  it("isSending and isResponding are false initially", () => {
    const { result } = renderHook(() => useInvites(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isSending).toBe(false);
    expect(result.current.isResponding).toBe(false);
  });

  it("sets up realtime subscription when user is authenticated", () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    renderHook(() => useInvites(), {
      wrapper: createWrapper(),
    });

    expect(mockChannel).toHaveBeenCalledWith("invites:user-1");
    expect(mockChannelOn).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "*",
        schema: "public",
        table: "player_invites",
        filter: "to_user_id=eq.user-1",
      }),
      expect.any(Function)
    );
    expect(mockChannelSubscribe).toHaveBeenCalled();
  });

  it("cleans up realtime subscription on unmount", () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const { unmount } = renderHook(() => useInvites(), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannelObj);
  });

  it("does not set up realtime subscription when no user", () => {
    renderHook(() => useInvites(), {
      wrapper: createWrapper(),
    });

    expect(mockChannel).not.toHaveBeenCalled();
  });
});
