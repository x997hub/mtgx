import type { Database } from "@/types/database.types";
type SubscriptionTarget = Database["public"]["Enums"]["subscription_target"];
type MtgFormat = Database["public"]["Enums"]["mtg_format"];
interface SubscribeParams {
    targetType: SubscriptionTarget;
    targetId?: string;
    format?: MtgFormat;
    city?: string;
}
export declare function useSubscription(): {
    subscriptions: {
        id: number;
        user_id: string;
        target_type: import("@/types/database.types").SubscriptionTarget;
        target_id: string | null;
        format: import("@/types/database.types").MtgFormat | null;
        city: string | null;
        created_at: string;
    }[];
    isLoading: boolean;
    subscribe: import("@tanstack/react-query").UseMutateFunction<{
        id: number;
        user_id: string;
        target_type: import("@/types/database.types").SubscriptionTarget;
        target_id: string | null;
        format: import("@/types/database.types").MtgFormat | null;
        city: string | null;
        created_at: string;
    }, Error, SubscribeParams, unknown>;
    unsubscribe: import("@tanstack/react-query").UseMutateFunction<void, Error, number, unknown>;
    isSubscribing: boolean;
};
export {};
//# sourceMappingURL=useSubscription.d.ts.map