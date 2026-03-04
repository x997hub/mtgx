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
export declare const useUIStore: import("zustand").UseBoundStore<import("zustand").StoreApi<UIState>>;
export {};
//# sourceMappingURL=uiStore.d.ts.map