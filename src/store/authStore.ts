import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  profileChecked: boolean;
  isAuthenticated: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  profileChecked: false,
  isAuthenticated: false,
  setSession: (session) =>
    set((state) => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      // Reset profile state when user changes (prevents onboarding flash)
      ...(state.user?.id !== session?.user?.id
        ? { profileChecked: false, profile: null }
        : {}),
    })),
  setProfile: (profile) => set({ profile, profileChecked: true }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () =>
    set({
      session: null,
      user: null,
      profile: null,
      isLoading: false,
      profileChecked: false,
      isAuthenticated: false,
    }),
}));
