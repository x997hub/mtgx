import type { Database } from "@/types/database.types";
type RsvpStatus = Database["public"]["Enums"]["rsvp_status"];
interface RSVPButtonProps {
    eventId: string;
    currentStatus?: RsvpStatus | null;
}
export declare function RSVPButton({ eventId, currentStatus }: RSVPButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=RSVPButton.d.ts.map