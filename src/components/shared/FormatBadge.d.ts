import type { Database } from "@/types/database.types";
type MtgFormat = Database["public"]["Enums"]["mtg_format"];
interface FormatBadgeProps {
    format: MtgFormat;
    className?: string;
}
export declare function FormatBadge({ format, className }: FormatBadgeProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=FormatBadge.d.ts.map