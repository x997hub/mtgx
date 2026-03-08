import { renderHook, waitFor } from "@testing-library/react";
import { useAutoMatch } from "../useAutoMatch";
import { useAuthStore } from "@/store/authStore";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Set up a fresh mock for supabase before each test
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockUpsertSelect = vi.fn().mockReturnValue({ single: mockSingle });
const mockUpsert = vi.fn().mockReturnValue({ select: mockUpsertSelect });
const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: mockMaybeSingle,
  upsert: mockUpsert,
};
const mockFrom = vi.fn().mockReturnValue(mockChain);

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockAutoMatchPrefs = {
  user_id: "user-1",
  formats: ["pauper", "commander"],
  event_types: ["big"],
  match_days: { sun: "always", mon: "if_free" },
  radius: "my_city",
  max_daily_notifications: 3,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

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

describe("useAutoMatch", () => {
  const initialAuthState = useAuthStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish default mock returns after clearAllMocks
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockUpsertSelect.mockReturnValue({ single: mockSingle });
    mockUpsert.mockReturnValue({ select: mockUpsertSelect });
    useAuthStore.setState(initialAuthState, true);
  });

  afterEach(() => {
    useAuthStore.setState(initialAuthState, true);
  });

  it("returns undefined prefs when user is not authenticated", async () => {
    const { result } = renderHook(() => useAutoMatch(), {
      wrapper: createWrapper(),
    });

    // Query is disabled when no user, so isLoading becomes false
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prefs).toBeUndefined();
  });

  it("returns prefs data when user is authenticated", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockMaybeSingle.mockResolvedValue({ data: mockAutoMatchPrefs, error: null });

    const { result } = renderHook(() => useAutoMatch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.prefs).toEqual(mockAutoMatchPrefs);
    });

    expect(mockFrom).toHaveBeenCalledWith("auto_match_preferences");
  });

  it("returns null when no prefs exist for the user", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAutoMatch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prefs).toBeNull();
  });

  it("exposes isUpdating as false initially", () => {
    const { result } = renderHook(() => useAutoMatch(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isUpdating).toBe(false);
  });

  it("exposes upsert function", () => {
    const { result } = renderHook(() => useAutoMatch(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.upsert).toBe("function");
  });

  it("throws error when upsert is called without authenticated user", async () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    const { result } = renderHook(() => useAutoMatch(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.upsert({ formats: ["pauper"] } as any)
    ).rejects.toThrow("Not authenticated");
  });

  it("calls supabase upsert with correct params when user is authenticated", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const upsertedData = { ...mockAutoMatchPrefs, formats: ["draft"] };
    mockMaybeSingle.mockResolvedValue({ data: mockAutoMatchPrefs, error: null });
    mockSingle.mockResolvedValue({ data: upsertedData, error: null });

    const { result } = renderHook(() => useAutoMatch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const data = await result.current.upsert({ formats: ["draft"] } as any);

    expect(mockUpsert).toHaveBeenCalledWith(
      { formats: ["draft"], user_id: "user-1" },
      { onConflict: "user_id" }
    );
    expect(data).toEqual(upsertedData);
  });

  it("handles query error by throwing", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "Database error", code: "500" },
    });

    const { result } = renderHook(() => useAutoMatch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Query errored, so prefs stays undefined
    expect(result.current.prefs).toBeUndefined();
  });
});
