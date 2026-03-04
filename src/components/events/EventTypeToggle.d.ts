import type { Database } from "@/types/database.types";
type EventType = Database["public"]["Enums"]["event_type"];
interface EventTypeToggleProps {
    value: EventType;
    onChange: (value: EventType) => void;
}
export declare function EventTypeToggle({ value, onChange }: EventTypeToggleProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=EventTypeToggle.d.ts.map