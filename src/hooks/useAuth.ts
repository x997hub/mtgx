import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

/** Module-level flag to prevent duplicate auth listeners across component instances */
let listenerInitialized = false;

/**
 * Sets up the Supabase auth listener exactly once (module-level guard).
 * Call this hook in a single top-level component (e.g. App.tsx or ProtectedRoute).
 */
export function useAuthListener() {
  const { setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    if (listenerInitialized) return;
    listenerInitialized = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      // Don't setProfile(null) here — setSession already resets profile
      // when user changes, and calling setProfile(null) prematurely
      // sets profileChecked=true causing an onboarding flash
      setLoading(false);

      // Clear URL params after OAuth callback (PKCE uses query params, implicit uses hash)
      if (event === "SIGNED_IN") {
        const url = new URL(window.location.href);
        if (window.location.hash.includes("access_token") || url.searchParams.has("code")) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Failed to get session:", error);
        setLoading(false);
        return;
      }
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      // Don't setProfile(null) here — setSession handles cleanup
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      listenerInitialized = false;
    };
  }, [setSession, setProfile, setLoading]);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        console.error("Failed to fetch profile:", error);
        setProfile(null);
        return;
      }
      // data is null when profile doesn't exist yet (new user)
      setProfile(data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setProfile(null);
    }
  }
}

/**
 * Lightweight hook that reads auth state from the store and provides login/logout functions.
 * Does NOT register any auth listeners -- call useAuthListener() once in a top-level component.
 */
export function useAuth() {
  const { session, user, profile, isLoading, profileChecked, isAuthenticated, reset } =
    useAuthStore();

  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  }

  async function logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Failed to sign out:", error);
      }
    } catch (err) {
      console.error("Failed to sign out:", err);
    } finally {
      reset();
    }
  }

  return {
    session,
    user,
    profile,
    isLoading,
    profileChecked,
    isAuthenticated,
    loginWithGoogle,
    logout,
  };
}
