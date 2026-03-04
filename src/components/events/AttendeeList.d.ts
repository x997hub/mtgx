import type { Database } from "@/types/database.types";
type RsvpStatus = Database["public"]["Enums"]["rsvp_status"];
interface Attendee {
    user_id: string;
    status: RsvpStatus;
    profiles?: {
        display_name: string;
    } | null;
}
interface AttendeeListProps {
    attendees: Attendee[];
}
export declare function AttendeeList({ attendees }: AttendeeListProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=AttendeeList.d.ts.map