import { create } from "zustand";
import type { Database } from "@/types/database.types";

type MtgFormat = Database["public"]["Enums"]["mtg_format"];
type ProxyPolicy = Database["public"]["Enums"]["proxy_policy"];
type EventMode = Database["public"]["Enums"]["event_mode"];

interface FilterState {
  format: MtgFormat | null;
  city: string | null;
  proxyPolicy: ProxyPolicy | null;
  eventMode: EventMode | null;
  setFormat: (format: MtgFormat | null) => void;
  setCity: (city: string | null) => void;
  setProxyPolicy: (proxyPolicy: ProxyPolicy | null) => void;
  setEventMode: (eventMode: EventMode | null) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  format: null,
  city: null,
  proxyPolicy: null,
  eventMode: null,
  setFormat: (format) => set({ format }),
  setCity: (city) => set({ city }),
  setProxyPolicy: (proxyPolicy) => set({ proxyPolicy }),
  setEventMode: (eventMode) => set({ eventMode }),
  resetFilters: () => set({ format: null, city: null, proxyPolicy: null, eventMode: null }),
}));
