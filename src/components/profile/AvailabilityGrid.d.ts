import type { Database } from "@/types/database.types";
type AvailabilityLevel = Database["public"]["Enums"]["availability_level"];
interface AvailabilityGridProps {
    value: Record<string, AvailabilityLevel>;
    onChange?: (value: Record<string, AvailabilityLevel>) => void;
    readOnly?: boolean;
}
export declare function AvailabilityGrid({ value, onChange, readOnly }: AvailabilityGridProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=AvailabilityGrid.d.ts.map