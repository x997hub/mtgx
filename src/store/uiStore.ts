import { create } from "zustand";

export type ThemeId = "light" | "dark" | "forest";

const THEME_CLASSES: ThemeId[] = ["dark", "forest"];

function safeGetItem(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function applyThemeToDOM(theme: ThemeId) {
  const root = document.documentElement;
  THEME_CLASSES.forEach((cls) => root.classList.remove(cls));
  if (theme !== "light") {
    root.classList.add(theme);
  }
  try {
    localStorage.setItem("mtgx-theme", theme);
  } catch {
    // ignore
  }
}

interface UIState {
  language: string;
  theme: ThemeId;
  sidebarOpen: boolean;
  notificationsCount: number;
  setLanguage: (language: string) => void;
  setTheme: (theme: ThemeId) => void;
  setSidebarOpen: (open: boolean) => void;
  setNotificationsCount: (count: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  language: safeGetItem("i18nextLng", "en"),
  theme: safeGetItem("mtgx-theme", "dark") as ThemeId,
  sidebarOpen: false,
  notificationsCount: 0,
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => {
    applyThemeToDOM(theme);
    set({ theme });
  },
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setNotificationsCount: (notificationsCount) => set({ notificationsCount }),
}));
