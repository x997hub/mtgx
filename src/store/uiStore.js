import { create } from "zustand";
export const useUIStore = create((set) => ({
    language: localStorage.getItem("i18nextLng") || "en",
    theme: "dark",
    sidebarOpen: false,
    notificationsCount: 0,
    setLanguage: (language) => set({ language }),
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    setNotificationsCount: (notificationsCount) => set({ notificationsCount }),
}));
