import type { Database } from "@/types/database.types";
type MtgFormat = Database["public"]["Enums"]["mtg_format"];
interface FilterState {
    format: MtgFormat | null;
    city: string | null;
    setFormat: (format: MtgFormat | null) => void;
    setCity: (city: string | null) => void;
    resetFilters: () => void;
}
export declare const useFilterStore: import("zustand").UseBoundStore<import("zustand").StoreApi<FilterState>>;
export {};
//# sourceMappingURL=filterStore.d.ts.map