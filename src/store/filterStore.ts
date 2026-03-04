import { create } from "zustand";
import type { Database } from "@/types/database.types";

type MtgFormat = Database["public"]["Enums"]["mtg_format"];

interface FilterState {
  format: MtgFormat | null;
  city: string | null;
  setFormat: (format: MtgFormat | null) => void;
  setCity: (city: string | null) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  format: null,
  city: null,
  setFormat: (format) => set({ format }),
  setCity: (city) => set({ city }),
  resetFilters: () => set({ format: null, city: null }),
}));
