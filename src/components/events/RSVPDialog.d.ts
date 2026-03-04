import type { Database } from "@/types/database.types";
type RsvpStatus = Database["public"]["Enums"]["rsvp_status"];
interface RSVPDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    eventId: string;
    currentStatus?: RsvpStatus | null;
}
export declare function RSVPDialog({ open, onOpenChange, eventId, currentStatus }: RSVPDialogProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=RSVPDialog.d.ts.map