import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
export function useAuth() {
    const { session, user, profile, isLoading, isAuthenticated, setSession, setProfile, setLoading, reset } = useAuthStore();
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            setLoading(false);
        });
        const { data: { subscription }, } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            else {
                setProfile(null);
            }
        });
        return () => subscription.unsubscribe();
    }, []);
    async function fetchProfile(userId) {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
        setProfile(data);
    }
    async function loginWithGoogle() {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/onboarding`,
            },
        });
    }
    async function logout() {
        await supabase.auth.signOut();
        reset();
    }
    return {
        session,
        user,
        profile,
        isLoading,
        isAuthenticated,
        loginWithGoogle,
        logout,
        fetchProfile,
    };
}
