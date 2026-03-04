export declare function useProfile(userId?: string): {
    profile: {
        id: string;
        display_name: string;
        city: string;
        formats: import("@/types/database.types").MtgFormat[];
        whatsapp: string | null;
        role: import("@/types/database.types").UserRole;
        reliability_score: number;
        created_at: string;
    } | null | undefined;
    availability: {
        id: number;
        user_id: string;
        day: import("@/types/database.types").DayOfWeek;
        slot: import("@/types/database.types").TimeSlot;
        level: import("@/types/database.types").AvailabilityLevel;
    }[];
    isLoading: boolean;
    updateProfile: import("@tanstack/react-query").UseMutateAsyncFunction<{
        id: string;
        display_name: string;
        city: string;
        formats: import("@/types/database.types").MtgFormat[];
        whatsapp: string | null;
        role: import("@/types/database.types").UserRole;
        reliability_score: number;
        created_at: string;
    }, Error, {
        id?: string;
        display_name?: string;
        city?: string;
        formats?: import("@/types/database.types").MtgFormat[];
        whatsapp?: string | null;
        role?: import("@/types/database.types").UserRole;
        reliability_score?: number;
        created_at?: string;
    }, unknown>;
    upsertProfile: import("@tanstack/react-query").UseMutateAsyncFunction<{
        id: string;
        display_name: string;
        city: string;
        formats: import("@/types/database.types").MtgFormat[];
        whatsapp: string | null;
        role: import("@/types/database.types").UserRole;
        reliability_score: number;
        created_at: string;
    }, Error, {
        id: string;
        display_name: string;
        city: string;
        formats?: import("@/types/database.types").MtgFormat[];
        whatsapp?: string | null;
        role?: import("@/types/database.types").UserRole;
        reliability_score?: number;
        created_at?: string;
    }, unknown>;
    updateAvailability: import("@tanstack/react-query").UseMutateAsyncFunction<void, Error, {
        user_id: string;
        day: import("@/types/database.types").DayOfWeek;
        slot: import("@/types/database.types").TimeSlot;
        level?: import("@/types/database.types").AvailabilityLevel;
    }[], unknown>;
    isUpdating: boolean;
};
//# sourceMappingURL=useProfile.d.ts.map