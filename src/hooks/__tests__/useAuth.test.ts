/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../useAuth";
import { useAuthStore } from "@/store/authStore";

// Mock supabase module
const mockSignInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null });
const mockSignOut = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));

describe("useAuth", () => {
  const initialState = useAuthStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    useAuthStore.setState(initialState, true);
  });

  it("returns session, user, profile from store", () => {
    const fakeUser = { id: "user-1", email: "a@a.com" } as any;
    const fakeSession = { user: fakeUser, access_token: "tok" } as any;
    const fakeProfile = { id: "user-1", display_name: "Alice", city: "Tel Aviv" } as any;

    useAuthStore.setState({
      session: fakeSession,
      user: fakeUser,
      profile: fakeProfile,
      isAuthenticated: true,
      isLoading: false,
      profileChecked: true,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.session).toEqual(fakeSession);
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.profile).toEqual(fakeProfile);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.profileChecked).toBe(true);
  });

  it("loginWithGoogle calls supabase.auth.signInWithOAuth", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.loginWithGoogle();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  });

  it("logout calls signOut and reset()", async () => {
    // Set some auth state first
    useAuthStore.setState({
      session: { user: { id: "user-1" } } as any,
      user: { id: "user-1" } as any,
      isAuthenticated: true,
      isLoading: false,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSignOut).toHaveBeenCalled();

    // After reset, store state should be cleared
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it("logout calls reset() even when signOut throws", async () => {
    mockSignOut.mockRejectedValue(new Error("network error"));

    useAuthStore.setState({
      session: { user: { id: "user-1" } } as any,
      user: { id: "user-1" } as any,
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useAuth());

    // suppress console.error from the catch block
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      await result.current.logout();
    });

    // Store should still be reset due to finally block
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);

    consoleSpy.mockRestore();
  });
});
