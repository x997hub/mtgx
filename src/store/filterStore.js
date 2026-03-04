import { create } from "zustand";
export const useFilterStore = create((set) => ({
    format: null,
    city: null,
    setFormat: (format) => set({ format }),
    setCity: (city) => set({ city }),
    resetFilters: () => set({ format: null, city: null }),
}));
