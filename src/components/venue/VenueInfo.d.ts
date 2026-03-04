import type { Database } from "@/types/database.types";
type Venue = Database["public"]["Tables"]["venues"]["Row"];
interface VenueInfoProps {
    venue: Venue;
}
export declare function VenueInfo({ venue }: VenueInfoProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=VenueInfo.d.ts.map