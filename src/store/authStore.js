import { create } from "zustand";
export const useAuthStore = create((set) => ({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    setSession: (session) => set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
    }),
    setProfile: (profile) => set({ profile }),
    setLoading: (isLoading) => set({ isLoading }),
    reset: () => set({
        session: null,
        user: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
    }),
}));
