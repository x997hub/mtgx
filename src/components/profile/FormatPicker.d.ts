import type { MtgFormat } from "@/types/database.types";
interface FormatPickerProps {
    selected: MtgFormat[];
    onChange: (formats: MtgFormat[]) => void;
}
export declare function FormatPicker({ selected, onChange }: FormatPickerProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=FormatPicker.d.ts.map