export declare function useNotifications(): {
    notifications: {
        id: number;
        user_id: string;
        event_id: string | null;
        type: string;
        title: string;
        body: string;
        is_read: boolean;
        created_at: string;
    }[];
    isLoading: boolean;
    markAsRead: import("@tanstack/react-query").UseMutateFunction<void, Error, number, unknown>;
    markAllRead: import("@tanstack/react-query").UseMutateFunction<void, Error, void, unknown>;
};
//# sourceMappingURL=useNotifications.d.ts.map