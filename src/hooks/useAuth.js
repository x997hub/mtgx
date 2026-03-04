import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
export function useAuth() {
    const { session, user, profile, isLoading, isAuthenticated, setSession, setProfile, setLoading, reset } = useAuthStore();
    const listenerFiredRef = useRef(false);
    useEffect(() => {
        listenerFiredRef.current = false;
        const { data: { subscription }, } = supabase.auth.onAuthStateChange((event, session) => {
            listenerFiredRef.current = true;
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            else {
                setProfile(null);
            }
            setLoading(false);
            // Clear hash fragment after OAuth callback
            if (event === "SIGNED_IN" && window.location.hash.includes("access_token")) {
                window.history.replaceState(null, "", window.location.pathname);
            }
        });
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error("Failed to get session:", error);
                setLoading(false);
                return;
            }
            // Only apply if the auth state listener hasn't already fired,
            // to avoid a race condition where both set session simultaneously.
            if (!listenerFiredRef.current) {
                setSession(session);
                if (session?.user) {
                    fetchProfile(session.user.id);
                }
                setLoading(false);
            }
        });
        return () => subscription.unsubscribe();
    }, []);
    async function fetchProfile(userId) {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();
            if (error) {
                console.error("Failed to fetch profile:", error);
                return;
            }
            // data is null when profile doesn't exist yet (new user)
            setProfile(data);
        }
        catch (err) {
            console.error("Failed to fetch profile:", err);
        }
    }
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
        }
        catch (err) {
            console.error("Failed to sign out:", err);
        }
        finally {
            reset();
        }
    }
    return {
        session,
        user,
        profile,
        isLoading,
        isAuthenticated,
        loginWithGoogle,
        logout,
    };
}
