/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiUrl, apiFetch, getAccessToken } from "../api";

// Mock supabase
const mockGetSession = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

/**
 * The API module computes API_BASE at module level from import.meta.env.VITE_SUPABASE_URL.
 * We use apiUrl("/") to derive the actual base URL at runtime, which ensures tests
 * work regardless of the .env values present.
 */
const API_BASE = apiUrl("").replace(/\/$/, ""); // strip trailing slash if any

describe("api module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "fresh-token-abc" } },
    });
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  });

  // ── apiUrl ────────────────────────────────────────────────────────

  describe("apiUrl", () => {
    it("generates correct URL from path", () => {
      const url = apiUrl("/rsvp");
      expect(url).toBe(`${API_BASE}/rsvp`);
    });

    it("returns base URL with trailing slash for root path", () => {
      const url = apiUrl("/");
      expect(url).toBe(`${API_BASE}/`);
    });

    it("handles nested paths", () => {
      const url = apiUrl("/admin/assign-role");
      expect(url).toBe(`${API_BASE}/admin/assign-role`);
    });

    it("appends path directly (no auto-slash for paths without leading /)", () => {
      const url = apiUrl("events");
      // apiUrl simply concatenates API_BASE + path
      expect(url).toContain("events");
    });

    it("URL contains /functions/v1/mtgx-api pattern", () => {
      const url = apiUrl("/test");
      expect(url).toMatch(/\/functions\/v1\/mtgx-api\/test$/);
    });
  });

  // ── getAccessToken ────────────────────────────────────────────────

  describe("getAccessToken", () => {
    it("calls supabase.auth.getSession()", async () => {
      await getAccessToken();
      expect(mockGetSession).toHaveBeenCalledTimes(1);
    });

    it("returns the access_token from session", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "my-fresh-token" } },
      });

      const token = await getAccessToken();
      expect(token).toBe("my-fresh-token");
    });

    it("throws 'Not authenticated' when session is null", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(getAccessToken()).rejects.toThrow("Not authenticated");
    });

    it("throws 'Not authenticated' when session is undefined", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: undefined },
      });

      await expect(getAccessToken()).rejects.toThrow("Not authenticated");
    });

    it("returns fresh token each time (no caching)", async () => {
      mockGetSession
        .mockResolvedValueOnce({ data: { session: { access_token: "token-1" } } })
        .mockResolvedValueOnce({ data: { session: { access_token: "token-2" } } });

      const t1 = await getAccessToken();
      const t2 = await getAccessToken();

      expect(t1).toBe("token-1");
      expect(t2).toBe("token-2");
      expect(mockGetSession).toHaveBeenCalledTimes(2);
    });
  });

  // ── apiFetch ──────────────────────────────────────────────────────

  describe("apiFetch", () => {
    it("calls fetch with apiUrl-generated URL", async () => {
      await apiFetch("/rsvp");

      expect(mockFetch).toHaveBeenCalledWith(
        apiUrl("/rsvp"),
        expect.any(Object)
      );
    });

    it("adds apikey header automatically", async () => {
      await apiFetch("/rsvp");

      const [, options] = mockFetch.mock.calls[0];
      const headers = options.headers as Headers;
      expect(headers.has("apikey")).toBe(true);
      expect(headers.get("apikey")).toBeTruthy();
    });

    it("apikey matches VITE_SUPABASE_ANON_KEY from env", async () => {
      await apiFetch("/rsvp");

      const [, options] = mockFetch.mock.calls[0];
      const headers = options.headers as Headers;
      // The apikey should be set to whatever import.meta.env.VITE_SUPABASE_ANON_KEY is
      expect(headers.get("apikey")).toBe(import.meta.env.VITE_SUPABASE_ANON_KEY);
    });

    it("adds Authorization header from supabase.auth.getSession()", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "auto-token-xyz" } },
      });

      await apiFetch("/rsvp");

      const [, options] = mockFetch.mock.calls[0];
      const headers = options.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer auto-token-xyz");
    });

    it("does NOT override Authorization when explicitly provided", async () => {
      await apiFetch("/rsvp", {
        headers: { Authorization: "Bearer custom-token" },
      });

      const [, options] = mockFetch.mock.calls[0];
      const headers = options.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer custom-token");

      // getSession should NOT have been called since Authorization was provided
      expect(mockGetSession).not.toHaveBeenCalled();
    });

    it("does NOT override apikey when explicitly provided", async () => {
      await apiFetch("/rsvp", {
        headers: { apikey: "custom-api-key" },
      });

      const [, options] = mockFetch.mock.calls[0];
      const headers = options.headers as Headers;
      expect(headers.get("apikey")).toBe("custom-api-key");
    });

    it("passes through method from options", async () => {
      await apiFetch("/rsvp", { method: "POST" });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe("POST");
    });

    it("passes through body from options", async () => {
      const body = JSON.stringify({ event_id: "e1", status: "going" });
      await apiFetch("/rsvp", { method: "POST", body });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.body).toBe(body);
    });

    it("adds Content-Type and other headers from options", async () => {
      await apiFetch("/events", {
        headers: {
          "Content-Type": "application/json",
          "X-Custom-Header": "custom-value",
        },
      });

      const [, options] = mockFetch.mock.calls[0];
      const headers = options.headers as Headers;
      expect(headers.get("Content-Type")).toBe("application/json");
      expect(headers.get("X-Custom-Header")).toBe("custom-value");
    });

    it("returns the Response object from fetch", async () => {
      const mockResponse = new Response(JSON.stringify({ rsvp: {} }), { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const result = await apiFetch("/rsvp");

      expect(result).toBe(mockResponse);
    });

    it("propagates fetch errors", async () => {
      mockFetch.mockRejectedValue(new TypeError("Network error"));

      await expect(apiFetch("/rsvp")).rejects.toThrow("Network error");
    });

    it("propagates getAccessToken errors when not authenticated", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      await expect(apiFetch("/rsvp")).rejects.toThrow("Not authenticated");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("works with Headers instance as input", async () => {
      const inputHeaders = new Headers();
      inputHeaders.set("X-Request-Id", "req-123");

      await apiFetch("/rsvp", { headers: inputHeaders });

      const [, options] = mockFetch.mock.calls[0];
      const headers = options.headers as Headers;
      expect(headers.get("X-Request-Id")).toBe("req-123");
      expect(headers.has("apikey")).toBe(true);
    });

    it("works without options parameter", async () => {
      await apiFetch("/events");

      expect(mockFetch).toHaveBeenCalledWith(
        apiUrl("/events"),
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );
    });

    it("makes a GET request by default (no method specified)", async () => {
      await apiFetch("/events");

      const [, options] = mockFetch.mock.calls[0];
      // When no method is specified, it should not set one (browser defaults to GET)
      expect(options.method).toBeUndefined();
    });

    it("preserves signal and other RequestInit options", async () => {
      const controller = new AbortController();
      await apiFetch("/rsvp", { signal: controller.signal });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.signal).toBe(controller.signal);
    });
  });
});
