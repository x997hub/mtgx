/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { useRSVP } from "../useRSVP";
import { useAuthStore } from "@/store/authStore";
import type { ReactNode } from "react";
import { createElement } from "react";

// Mock toast
vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock fetch for RSVP endpoint
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useRSVP", () => {
  const initialAuthState = useAuthStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState(initialAuthState, true);
    mockFetch.mockReset();
  });

  afterEach(() => {
    useAuthStore.setState(initialAuthState, true);
  });

  it("returns a mutation object with mutateAsync", () => {
    const { result } = renderHook(() => useRSVP(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.mutateAsync).toBe("function");
    expect(result.current.isPending).toBe(false);
  });

  it("throws when user is not authenticated", async () => {
    // user is null by default
    const { result } = renderHook(() => useRSVP(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          eventId: "event-1",
          status: "going",
        });
      })
    ).rejects.toThrow("Not authenticated");
  });

  it("calls fetch with correct URL and body on successful RSVP", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      session: { access_token: "mock-token", user: { id: "user-1" } } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const rsvpResponse = {
      rsvp: {
        event_id: "event-1",
        user_id: "user-1",
        status: "going",
        queue_position: null,
      },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(rsvpResponse),
    });

    const { result } = renderHook(() => useRSVP(), {
      wrapper: createWrapper(),
    });

    let rsvpResult: any;
    await act(async () => {
      rsvpResult = await result.current.mutateAsync({
        eventId: "event-1",
        status: "going",
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/functions/v1/mtgx-api/rsvp"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ event_id: "event-1", status: "going" }),
      })
    );
    // Verify headers via Headers instance
    const callHeaders = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders.get("Authorization")).toBe("Bearer mock-token");
    expect(callHeaders.get("Content-Type")).toBe("application/json");
    expect(callHeaders.get("apikey")).toBeTruthy();

    expect(rsvpResult).toEqual(rsvpResponse.rsvp);
  });

  it("includes power_level in body when provided", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      session: { access_token: "mock-token", user: { id: "user-1" } } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          rsvp: { event_id: "event-1", user_id: "user-1", status: "going", power_level: 3 },
        }),
    });

    const { result } = renderHook(() => useRSVP(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        eventId: "event-1",
        status: "going",
        powerLevel: 3,
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ event_id: "event-1", status: "going", power_level: 3 }),
      })
    );
  });

  it("throws error when API returns non-ok response", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      session: { access_token: "mock-token", user: { id: "user-1" } } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Event is full" }),
    });

    const { result } = renderHook(() => useRSVP(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          eventId: "event-1",
          status: "going",
        });
      })
    ).rejects.toThrow("Event is full");
  });

  it("throws generic error when API returns non-ok without error message", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      session: { access_token: "mock-token", user: { id: "user-1" } } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useRSVP(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          eventId: "event-1",
          status: "going",
        });
      })
    ).rejects.toThrow("RSVP failed");
  });
});
