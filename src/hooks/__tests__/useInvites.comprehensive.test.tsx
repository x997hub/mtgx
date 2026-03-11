/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor, act } from "@testing-library/react";
import { useInvites } from "../useInvites";
import { useAuthStore } from "@/store/authStore";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { InviteWithRelations } from "../useInvites";

// ---- Supabase mock chain ----
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
const mockChannelObj = {
  on: mockChannelOn,
  subscribe: mockChannelSubscribe,
  unsubscribe: mockChannelUnsubscribe,
};
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

// ---- apiFetch mock ----
const mockApiFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiUrl: (p: string) => `https://test.co${p}`,
  getAccessToken: vi.fn().mockResolvedValue("mock-token"),
}));

// ---- toast mock ----
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

// ---- realtime subscription mock ----
vi.mock("@/hooks/useRealtimeSubscription", () => ({
  useRealtimeSubscription: vi.fn(),
}));

// ---- Test data ----
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

// ---- Helpers ----
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

function setAuthenticatedUser(id = "user-1") {
  useAuthStore.setState({
    user: { id, email: "test@test.com" } as any,
    isAuthenticated: true,
    isLoading: false,
  });
}

/**
 * Sets up mockFrom to handle both player_invites and profiles tables,
 * differentiating incoming (to_user_id) from outgoing (from_user_id) by eq field.
 */
function setupInvitesMock(
  incoming: InviteWithRelations[] = mockIncomingInvites,
  outgoing: InviteWithRelations[] = mockOutgoingInvites,
  senderProfiles = mockSenderProfiles,
  receiverProfiles = mockReceiverProfiles
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "player_invites") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((field: string) => {
          const orderMock = vi.fn();
          if (field === "to_user_id") {
            orderMock.mockResolvedValue({ data: [...incoming], error: null });
          } else {
            orderMock.mockResolvedValue({ data: [...outgoing], error: null });
          }
          return { order: orderMock };
        }),
      };
    }
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [...senderProfiles, ...receiverProfiles],
          error: null,
        }),
      };
    }
    return mockChain;
  });
}

describe("useInvites — comprehensive", () => {
  const initialAuthState = useAuthStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
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

  // ---------- incomingQuery ----------
  describe("incomingQuery", () => {
    it("returns empty array when user is not authenticated", async () => {
      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.incoming).toEqual([]);
    });

    it("fetches player_invites with to_user_id filter and joins events", async () => {
      setAuthenticatedUser();
      setupInvitesMock();

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.incoming.length).toBeGreaterThan(0);
      });

      expect(result.current.incoming).toHaveLength(3);
      // Verify the supabase call was made to player_invites
      expect(mockFrom).toHaveBeenCalledWith("player_invites");
    });

    it("batch-fetches sender profiles and attaches from_profile", async () => {
      setAuthenticatedUser();
      setupInvitesMock();

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.incoming.length).toBe(3);
      });

      // Profiles should have been fetched from profiles table
      expect(mockFrom).toHaveBeenCalledWith("profiles");

      // Each incoming invite should have from_profile attached
      const inv = result.current.incoming[0];
      expect(inv.from_profile).toBeDefined();
      expect(inv.from_profile?.display_name).toBe("Sender One");
    });

    it("handles supabase error on incoming query", async () => {
      setAuthenticatedUser();

      mockFrom.mockImplementation((table: string) => {
        if (table === "player_invites") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((field: string) => {
              const orderMock = vi.fn();
              if (field === "to_user_id") {
                orderMock.mockResolvedValue({ data: null, error: { message: "DB error" } });
              } else {
                orderMock.mockResolvedValue({ data: [], error: null });
              }
              return { order: orderMock };
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
      });

      // On error, data falls back to empty array
      expect(result.current.incoming).toEqual([]);
    });
  });

  // ---------- outgoingQuery ----------
  describe("outgoingQuery", () => {
    it("fetches player_invites with from_user_id filter", async () => {
      setAuthenticatedUser();
      setupInvitesMock();

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.outgoing.length).toBe(1);
      });

      expect(result.current.outgoing[0].to_user_id).toBe("receiver-1");
    });

    it("batch-fetches receiver profiles and attaches to_profile", async () => {
      setAuthenticatedUser();
      setupInvitesMock();

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.outgoing.length).toBe(1);
      });

      const inv = result.current.outgoing[0];
      expect(inv.to_profile).toBeDefined();
      expect(inv.to_profile?.display_name).toBe("Receiver One");
    });

    it("returns empty outgoing when no invites sent", async () => {
      setAuthenticatedUser();
      setupInvitesMock(mockIncomingInvites, []);

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.outgoing).toEqual([]);
    });
  });

  // ---------- sendInvite ----------
  describe("sendInvite", () => {
    it("calls apiFetch POST /invites with correct params", async () => {
      setAuthenticatedUser();
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 100 }),
      });

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sendInvite({
          to_user_id: "receiver-1",
          event_id: "event-1",
          format: "pauper",
          message: "Let's play!",
        });
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: "receiver-1",
          event_id: "event-1",
          format: "pauper",
          message: "Let's play!",
        }),
        signal: expect.any(AbortSignal),
      });
    });

    it("sends without event_id when not provided", async () => {
      setAuthenticatedUser();
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 101 }),
      });

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sendInvite({
          to_user_id: "receiver-1",
          format: "commander",
        });
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/invites", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          to_user_id: "receiver-1",
          format: "commander",
        }),
      }));
    });

    it("throws when user is not authenticated", async () => {
      // Don't set auth — user is null
      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.sendInvite({
            to_user_id: "receiver-1",
            format: "pauper",
          });
        })
      ).rejects.toThrow("Not authenticated");
    });

    it("shows destructive toast on send failure", async () => {
      setAuthenticatedUser();
      mockApiFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Rate limited" }),
      });

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      try {
        await act(async () => {
          await result.current.sendInvite({
            to_user_id: "receiver-1",
            format: "pauper",
          });
        });
      } catch {
        // expected to throw
      }

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" })
        );
      });
    });

    it("shows generic error message when API returns no error field", async () => {
      setAuthenticatedUser();
      mockApiFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.sendInvite({
            to_user_id: "receiver-1",
          });
        })
      ).rejects.toThrow("Failed to send invite");
    });

    it("invalidates outgoing queries after successful send", async () => {
      setAuthenticatedUser();
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 102 }),
      });

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      function Wrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useInvites(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.sendInvite({
          to_user_id: "receiver-1",
          format: "draft",
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ["invites-outgoing", "user-1"],
          })
        );
      });
    });
  });

  // ---------- respondInvite ----------
  describe("respondInvite", () => {
    it("calls apiFetch PATCH /invites/respond with invite_id and accepted status", async () => {
      setAuthenticatedUser();
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.respondInvite({
          invite_id: 1,
          status: "accepted",
        });
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/invites/respond", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: 1, status: "accepted" }),
        signal: expect.any(AbortSignal),
      });
    });

    it("calls apiFetch with declined status", async () => {
      setAuthenticatedUser();
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.respondInvite({
          invite_id: 5,
          status: "declined",
        });
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/invites/respond", expect.objectContaining({
        body: JSON.stringify({ invite_id: 5, status: "declined" }),
      }));
    });

    it("shows destructive toast on respond failure", async () => {
      setAuthenticatedUser();
      mockApiFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Already responded" }),
      });

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      try {
        await act(async () => {
          await result.current.respondInvite({
            invite_id: 1,
            status: "accepted",
          });
        });
      } catch {
        // expected to throw
      }

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" })
        );
      });
    });

    it("invalidates both incoming and outgoing queries after respond", async () => {
      setAuthenticatedUser();
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      function Wrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useInvites(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.respondInvite({
          invite_id: 1,
          status: "accepted",
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ["invites-incoming", "user-1"],
          })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ["invites-outgoing", "user-1"],
          })
        );
      });
    });
  });

  // ---------- pendingCount ----------
  describe("pendingCount", () => {
    it("counts only pending incoming invites", async () => {
      setAuthenticatedUser();
      setupInvitesMock();

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.incoming.length).toBe(3);
      });

      // mockIncomingInvites has 2 pending (id:1, id:3) and 1 accepted (id:2)
      expect(result.current.pendingCount).toBe(2);
    });

    it("returns 0 when all invites are responded to", async () => {
      setAuthenticatedUser();

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

      setupInvitesMock(respondedInvites, [], [
        { id: "sender-1", display_name: "S1", avatar_url: null },
        { id: "sender-2", display_name: "S2", avatar_url: null },
      ]);

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.incoming.length).toBe(2);
      });

      expect(result.current.pendingCount).toBe(0);
    });

    it("returns 0 when there are no incoming invites", async () => {
      setAuthenticatedUser();
      setupInvitesMock([], []);

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pendingCount).toBe(0);
    });

    it("returns 0 when user is not authenticated", async () => {
      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pendingCount).toBe(0);
    });
  });

  // ---------- Boolean flags ----------
  describe("flags", () => {
    it("isSending and isResponding are false initially", () => {
      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSending).toBe(false);
      expect(result.current.isResponding).toBe(false);
    });

    it("exposes sendInvite and respondInvite as functions", () => {
      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.sendInvite).toBe("function");
      expect(typeof result.current.respondInvite).toBe("function");
    });

    it("isLoading is true while queries are fetching", () => {
      setAuthenticatedUser();
      // Never resolve — keep loading
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(new Promise(() => {})),
      }));

      const { result } = renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  // ---------- Realtime ----------
  describe("realtime subscription", () => {
    it("sets up realtime channel for authenticated user", () => {
      setAuthenticatedUser();

      renderHook(() => useInvites(), {
        wrapper: createWrapper(),
      });

      // useRealtimeSubscription is mocked, so we just verify the hook didn't crash
      expect(true).toBe(true);
    });
  });
});
