import type { Database } from "@/types/database.types";
type Event = Database["public"]["Tables"]["events"]["Row"];
interface EventCardProps {
    event: Event & {
        venues?: {
            name: string;
            city: string;
        } | null;
        profiles?: {
            display_name: string;
        } | null;
    };
    rsvpCount?: number;
}
export declare function EventCard({ event, rsvpCount }: EventCardProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=EventCard.d.ts.map