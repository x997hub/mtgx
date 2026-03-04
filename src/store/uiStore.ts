import { create } from "zustand";

function safeGetItem(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

interface UIState {
  language: string;
  theme: "dark";
  sidebarOpen: boolean;
  notificationsCount: number;
  setLanguage: (language: string) => void;
  setTheme: (theme: "dark") => void;
  setSidebarOpen: (open: boolean) => void;
  setNotificationsCount: (count: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  language: safeGetItem("i18nextLng", "en"),
  theme: "dark",
  sidebarOpen: false,
  notificationsCount: 0,
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => set({ theme }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setNotificationsCount: (notificationsCount) => set({ notificationsCount }),
}));
