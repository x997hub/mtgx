import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
export function useNotifications() {
    const user = useAuthStore((s) => s.user);
    const setNotificationsCount = useUIStore((s) => s.setNotificationsCount);
    const queryClient = useQueryClient();
    const notificationsQuery = useQuery({
        queryKey: ["notifications", user?.id],
        queryFn: async () => {
            if (!user)
                return [];
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(50);
            if (error)
                throw error;
            return data;
        },
        enabled: !!user,
    });
    // Update unread count
    useEffect(() => {
        const unread = notificationsQuery.data?.filter((n) => !n.is_read).length ?? 0;
        setNotificationsCount(unread);
    }, [notificationsQuery.data, setNotificationsCount]);
    // Realtime subscription for new notifications
    useEffect(() => {
        if (!user)
            return;
        const channel = supabase
            .channel("notifications")
            .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
        }, () => {
            queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient]);
    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId) => {
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", notificationId);
            if (error)
                throw error;
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
        },
    });
    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            if (!user)
                return;
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", user.id)
                .eq("is_read", false);
            if (error)
                throw error;
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
        },
    });
    return {
        notifications: notificationsQuery.data ?? [],
        isLoading: notificationsQuery.isLoading,
        markAsRead: markAsReadMutation.mutate,
        markAllRead: markAllReadMutation.mutate,
    };
}
