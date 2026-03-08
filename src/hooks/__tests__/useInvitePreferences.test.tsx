import { renderHook, waitFor } from "@testing-library/react";
import { useInvitePreferences } from "../useInvitePreferences";
import { useAuthStore } from "@/store/authStore";
import { createTestQueryClient } from "@/test/renderWithProviders";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Set up fresh mocks for supabase
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

const mockInvitePrefs = {
  user_id: "user-1",
  is_open: true,
  available_slots: { sun_morning: true, sun_evening: false },
  formats: ["pauper", "commander"],
  visibility: "all" as const,
  dnd_until: null,
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

describe("useInvitePreferences", () => {
  const initialAuthState = useAuthStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish defaults after clearAllMocks
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

  it("returns undefined prefs when no user is authenticated and no userId provided", async () => {
    const { result } = renderHook(() => useInvitePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prefs).toBeUndefined();
  });

  it("fetches prefs using currentUser.id when no userId argument is provided", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockMaybeSingle.mockResolvedValue({ data: mockInvitePrefs, error: null });

    const { result } = renderHook(() => useInvitePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.prefs).toEqual(mockInvitePrefs);
    });

    expect(mockFrom).toHaveBeenCalledWith("invite_preferences");
  });

  it("fetches prefs for a specific userId when provided", async () => {
    mockMaybeSingle.mockResolvedValue({ data: mockInvitePrefs, error: null });

    const { result } = renderHook(() => useInvitePreferences("other-user-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.prefs).toEqual(mockInvitePrefs);
    });

    expect(mockChain.eq).toHaveBeenCalledWith("user_id", "other-user-id");
  });

  it("returns null prefs when no data exists", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useInvitePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prefs).toBeNull();
  });

  it("exposes upsert function", () => {
    const { result } = renderHook(() => useInvitePreferences(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.upsert).toBe("function");
  });

  it("exposes updateDnd function", () => {
    const { result } = renderHook(() => useInvitePreferences(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.updateDnd).toBe("function");
  });

  it("isUpdating is false initially", () => {
    const { result } = renderHook(() => useInvitePreferences(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isUpdating).toBe(false);
  });

  it("upsert throws when user is not authenticated", async () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    const { result } = renderHook(() => useInvitePreferences(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.upsert({ is_open: false } as any)
    ).rejects.toThrow("Not authenticated");
  });

  it("upsert calls supabase with correct params", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const upsertedData = { ...mockInvitePrefs, is_open: false };
    mockMaybeSingle.mockResolvedValue({ data: mockInvitePrefs, error: null });
    mockSingle.mockResolvedValue({ data: upsertedData, error: null });

    const { result } = renderHook(() => useInvitePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const data = await result.current.upsert({ is_open: false } as any);

    expect(mockUpsert).toHaveBeenCalledWith(
      { is_open: false, user_id: "user-1" },
      { onConflict: "user_id" }
    );
    expect(data).toEqual(upsertedData);
  });

  it("updateDnd throws when user is not authenticated", async () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    const { result } = renderHook(() => useInvitePreferences(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.updateDnd("2026-03-10T00:00:00Z")
    ).rejects.toThrow("Not authenticated");
  });

  it("updateDnd calls supabase upsert with dnd_until", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const dndDate = "2026-03-10T00:00:00Z";
    const updatedData = { ...mockInvitePrefs, dnd_until: dndDate };
    mockMaybeSingle.mockResolvedValue({ data: mockInvitePrefs, error: null });
    mockSingle.mockResolvedValue({ data: updatedData, error: null });

    const { result } = renderHook(() => useInvitePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const data = await result.current.updateDnd(dndDate);

    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: "user-1", dnd_until: dndDate },
      { onConflict: "user_id" }
    );
    expect(data).toEqual(updatedData);
  });

  it("updateDnd can set dnd_until to null", async () => {
    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const updatedData = { ...mockInvitePrefs, dnd_until: null };
    mockMaybeSingle.mockResolvedValue({ data: mockInvitePrefs, error: null });
    mockSingle.mockResolvedValue({ data: updatedData, error: null });

    const { result } = renderHook(() => useInvitePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const data = await result.current.updateDnd(null);

    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: "user-1", dnd_until: null },
      { onConflict: "user_id" }
    );
    expect(data).toEqual(updatedData);
  });
});
