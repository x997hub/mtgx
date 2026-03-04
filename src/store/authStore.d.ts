import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
interface AuthState {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    setSession: (session: Session | null) => void;
    setProfile: (profile: Profile | null) => void;
    setLoading: (loading: boolean) => void;
    reset: () => void;
}
export declare const useAuthStore: import("zustand").UseBoundStore<import("zustand").StoreApi<AuthState>>;
export {};
//# sourceMappingURL=authStore.d.ts.map