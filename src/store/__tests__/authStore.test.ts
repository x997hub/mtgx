/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuthStore } from "../authStore";

describe("useAuthStore", () => {
  const initialState = useAuthStore.getState();

  afterEach(() => {
    useAuthStore.setState(initialState, true);
  });

  it("has correct initial state", () => {
    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(true);
    expect(state.profileChecked).toBe(false);
    expect(state.isAuthenticated).toBe(false);
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
  });

  describe("setSession", () => {
    it("sets isAuthenticated=true and user when session provided", () => {
      const fakeUser = { id: "user-1", email: "test@test.com" };
      const fakeSession = { user: fakeUser, access_token: "tok" } as any;

      useAuthStore.getState().setSession(fakeSession);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(fakeUser);
      expect(state.session).toEqual(fakeSession);
    });

    it("sets isAuthenticated=false and user=null when session is null", () => {
      // First set a session
      const fakeUser = { id: "user-1", email: "test@test.com" };
      const fakeSession = { user: fakeUser, access_token: "tok" } as any;
      useAuthStore.getState().setSession(fakeSession);

      // Then set null
      useAuthStore.getState().setSession(null);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
    });

    it("resets profileChecked and profile when user.id changes", () => {
      const fakeUser1 = { id: "user-1", email: "a@a.com" };
      const fakeSession1 = { user: fakeUser1, access_token: "tok1" } as any;
      useAuthStore.getState().setSession(fakeSession1);
      useAuthStore.getState().setProfile({ id: "user-1", display_name: "Alice" } as any);

      expect(useAuthStore.getState().profileChecked).toBe(true);
      expect(useAuthStore.getState().profile).not.toBeNull();

      // Switch to different user
      const fakeUser2 = { id: "user-2", email: "b@b.com" };
      const fakeSession2 = { user: fakeUser2, access_token: "tok2" } as any;
      useAuthStore.getState().setSession(fakeSession2);

      const state = useAuthStore.getState();
      expect(state.profileChecked).toBe(false);
      expect(state.profile).toBeNull();
      expect(state.user?.id).toBe("user-2");
    });

    it("does NOT reset profileChecked/profile when user.id is the same", () => {
      const fakeUser = { id: "user-1", email: "a@a.com" };
      const fakeSession = { user: fakeUser, access_token: "tok1" } as any;
      useAuthStore.getState().setSession(fakeSession);
      useAuthStore.getState().setProfile({ id: "user-1", display_name: "Alice" } as any);

      // Set session with same user id
      const updatedSession = { user: fakeUser, access_token: "tok2" } as any;
      useAuthStore.getState().setSession(updatedSession);

      const state = useAuthStore.getState();
      expect(state.profileChecked).toBe(true);
      expect(state.profile).not.toBeNull();
    });
  });

  describe("setProfile", () => {
    it("sets profile and profileChecked=true", () => {
      const profile = { id: "user-1", display_name: "Alice", city: "Tel Aviv" } as any;
      useAuthStore.getState().setProfile(profile);

      const state = useAuthStore.getState();
      expect(state.profile).toEqual(profile);
      expect(state.profileChecked).toBe(true);
    });

    it("sets profile=null but profileChecked=true when called with null", () => {
      useAuthStore.getState().setProfile(null);

      const state = useAuthStore.getState();
      expect(state.profile).toBeNull();
      expect(state.profileChecked).toBe(true);
    });
  });

  describe("setLoading", () => {
    it("sets isLoading", () => {
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);

      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });
  });

  describe("reset", () => {
    it("resets all fields to defaults", () => {
      // Set some state
      const fakeUser = { id: "user-1", email: "a@a.com" };
      const fakeSession = { user: fakeUser, access_token: "tok" } as any;
      useAuthStore.getState().setSession(fakeSession);
      useAuthStore.getState().setProfile({ id: "user-1", display_name: "Alice" } as any);

      // Reset
      useAuthStore.getState().reset();

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.profileChecked).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
