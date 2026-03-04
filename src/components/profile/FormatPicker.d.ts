import type { Database } from "@/types/database.types";
type MtgFormat = Database["public"]["Enums"]["mtg_format"];
interface FormatPickerProps {
    selected: MtgFormat[];
    onChange: (formats: MtgFormat[]) => void;
}
export declare function FormatPicker({ selected, onChange }: FormatPickerProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=FormatPicker.d.ts.map