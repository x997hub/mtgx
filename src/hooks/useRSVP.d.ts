import type { Database } from "@/types/database.types";
type RsvpStatus = Database["public"]["Enums"]["rsvp_status"];
interface RSVPParams {
    eventId: string;
    status: RsvpStatus;
}
export declare function useRSVP(): import("@tanstack/react-query").UseMutationResult<{
    id: number;
    event_id: string;
    user_id: string;
    status: import("@/types/database.types").RsvpStatus;
    created_at: string;
    updated_at: string;
}, Error, RSVPParams, {
    previous: unknown;
}>;
export {};
//# sourceMappingURL=useRSVP.d.ts.map