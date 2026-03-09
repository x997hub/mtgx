import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useUIStore } from "@/store/uiStore";

export function useNotifications() {
  const user = useAuthStore((s) => s.user);
  const setNotificationsCount = useUIStore((s) => s.setNotificationsCount);
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
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
  useRealtimeSubscription({
    channelName: "notifications",
    table: "notifications",
    filter: `user_id=eq.${user?.id}`,
    event: "INSERT",
    enabled: !!user,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onError: (error) => {
      console.error("Failed to mark notification as read:", error);
    },
    onSettled: () => {
      const userId = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUser.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onError: (error) => {
      console.error("Failed to mark all notifications as read:", error);
    },
    onSettled: () => {
      const userId = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  return {
    notifications: notificationsQuery.data ?? [],
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    refetch: notificationsQuery.refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  };
}
