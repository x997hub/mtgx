import { create } from "zustand";
function safeGetItem(key, fallback) {
    try {
        return localStorage.getItem(key) || fallback;
    }
    catch {
        return fallback;
    }
}
export const useUIStore = create((set) => ({
    language: safeGetItem("i18nextLng", "en"),
    theme: "dark",
    sidebarOpen: false,
    notificationsCount: 0,
    setLanguage: (language) => set({ language }),
    setTheme: (theme) => set({ theme }),
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    setNotificationsCount: (notificationsCount) => set({ notificationsCount }),
}));
