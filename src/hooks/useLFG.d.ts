import type { MtgFormat } from "@/types/database.types";
interface LFGSignal {
    id: number;
    user_id: string;
    city: string;
    formats: MtgFormat[];
    expires_at: string;
    created_at: string;
    profiles?: {
        display_name: string;
    } | null;
}
interface ActivateLFGParams {
    city: string;
    formats: MtgFormat[];
}
/**
 * Hook for Looking-For-Game (LFG) functionality.
 * - Query current user's active signal
 * - Query all active signals in a city
 * - Activate / deactivate signal
 * - Realtime subscription for live signal updates
 */
export declare function useLFG(city?: string): {
    mySignal: {
        id: number;
        user_id: string;
        city: string;
        formats: MtgFormat[];
        expires_at: string;
        created_at: string;
    } | null;
    isMySignalLoading: boolean;
    signals: LFGSignal[];
    isSignalsLoading: boolean;
    activate: import("@tanstack/react-query").UseMutateFunction<{
        id: number;
        user_id: string;
        city: string;
        formats: MtgFormat[];
        expires_at: string;
        created_at: string;
    }, Error, ActivateLFGParams, unknown>;
    deactivate: import("@tanstack/react-query").UseMutateFunction<void, Error, void, unknown>;
    isActivating: boolean;
    isDeactivating: boolean;
};
export {};
//# sourceMappingURL=useLFG.d.ts.map