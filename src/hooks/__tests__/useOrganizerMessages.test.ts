/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { useOrganizerMessages } from "../useOrganizerMessages";
import type { ReactNode } from "react";
import { createElement } from "react";

// Mock supabase for messagesQuery
const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: mockOrder,
};

const mockFrom = vi.fn().mockReturnValue(mockChain);

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
  },
}));

// Mock fetch for apiFetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useOrganizerMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockFetch.mockReset();
  });

  // ── messagesQuery ──

  it("fetches organizer messages for event ordered by created_at desc", async () => {
    const mockMessages = [
      {
        id: 2,
        event_id: "event-1",
        organizer_id: "org-1",
        body: "Second message",
        created_at: "2026-03-10T12:00:00Z",
      },
      {
        id: 1,
        event_id: "event-1",
        organizer_id: "org-1",
        body: "First message",
        created_at: "2026-03-10T10:00:00Z",
      },
    ];

    mockOrder.mockResolvedValue({ data: mockMessages, error: null });

    const { result } = renderHook(() => useOrganizerMessages("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages).toEqual(mockMessages);
    expect(mockFrom).toHaveBeenCalledWith("organizer_messages");
    expect(mockChain.eq).toHaveBeenCalledWith("event_id", "event-1");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("returns empty messages when no data", async () => {
    mockOrder.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useOrganizerMessages("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toEqual([]);
  });

  it("query is disabled when eventId is empty", async () => {
    const { result } = renderHook(() => useOrganizerMessages(""), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toEqual([]);
  });

  // ── sendMessage ──

  it("sendMessage calls apiFetch POST /event-message with event_id and message", async () => {
    const responseBody = { id: 5, event_id: "event-1", body: "Hello!" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseBody),
    });

    const { result } = renderHook(() => useOrganizerMessages("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let sendResult: any;
    await act(async () => {
      sendResult = await result.current.sendMessage("Hello!");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/event-message"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ event_id: "event-1", message: "Hello!" }),
      })
    );

    // Verify headers
    const callHeaders = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders.get("Content-Type")).toBe("application/json");
    expect(callHeaders.get("Authorization")).toBe("Bearer mock-token");

    expect(sendResult).toEqual(responseBody);
  });

  it("sendMessage throws when API returns non-ok response with error message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Forbidden" }),
    });

    const { result } = renderHook(() => useOrganizerMessages("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.sendMessage("Hello!");
      })
    ).rejects.toThrow("Forbidden");
  });

  it("sendMessage throws generic error when API returns non-ok without error field", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useOrganizerMessages("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.sendMessage("Hello!");
      })
    ).rejects.toThrow("Failed to send message");
  });

  it("sendMessage throws generic error when JSON parsing fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    const { result } = renderHook(() => useOrganizerMessages("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.sendMessage("Hello!");
      })
    ).rejects.toThrow("Failed to send message");
  });

  // ── isSending state ──

  it("isSending is false initially", () => {
    const { result } = renderHook(() => useOrganizerMessages("event-1"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isSending).toBe(false);
  });

  // ── Error handling on query ──

  it("handles supabase error on fetch gracefully", async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const { result } = renderHook(() => useOrganizerMessages("event-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // On error, messages should stay as empty default
    expect(result.current.messages).toEqual([]);
  });

  // ── Cache invalidation after send ──

  it("invalidates organizer-messages query after successful send", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 10, body: "Hi" }),
    });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useOrganizerMessages("event-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.sendMessage("Test message");
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["organizer-messages", "event-1"],
      });
    });
  });

  it("does not invalidate cache on failed send", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Unauthorized" }),
    });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useOrganizerMessages("event-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    try {
      await act(async () => {
        await result.current.sendMessage("Fail");
      });
    } catch {
      // expected
    }

    // invalidateQueries may be called for the initial query fetch,
    // but NOT for "organizer-messages" specifically after a failed send
    const orgMsgInvalidations = invalidateSpy.mock.calls.filter(
      (call) => {
        const arg = call[0] as any;
        return arg?.queryKey?.[0] === "organizer-messages" && arg?.queryKey?.[1] === "event-1";
      }
    );
    // onSuccess is not called on failure, so no invalidation for organizer-messages
    expect(orgMsgInvalidations).toHaveLength(0);
  });
});
