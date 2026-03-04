export declare function useAuth(): {
    session: import("@supabase/auth-js").Session | null;
    user: import("@supabase/auth-js").User | null;
    profile: {
        id: string;
        display_name: string;
        city: string;
        formats: import("../types/database.types").MtgFormat[];
        whatsapp: string | null;
        role: import("../types/database.types").UserRole;
        reliability_score: number;
        created_at: string;
    } | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
};
//# sourceMappingURL=useAuth.d.ts.map