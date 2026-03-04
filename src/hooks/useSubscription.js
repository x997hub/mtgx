import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
export function useSubscription() {
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const subscriptionsQuery = useQuery({
        queryKey: ["subscriptions", user?.id],
        queryFn: async () => {
            if (!user)
                return [];
            const { data, error } = await supabase
                .from("subscriptions")
                .select("*")
                .eq("user_id", user.id);
            if (error)
                throw error;
            return data;
        },
        enabled: !!user,
    });
    const subscribeMutation = useMutation({
        mutationFn: async ({ targetType, targetId, format, city }) => {
            if (!user)
                throw new Error("Not authenticated");
            const { data, error } = await supabase
                .from("subscriptions")
                .upsert({
                user_id: user.id,
                target_type: targetType,
                target_id: targetId ?? null,
                format: format ?? null,
                city: city ?? null,
            }, { onConflict: "user_id,target_type,target_id,format,city" })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSettled: () => {
            const userId = useAuthStore.getState().user?.id;
            queryClient.invalidateQueries({ queryKey: ["subscriptions", userId] });
        },
    });
    const unsubscribeMutation = useMutation({
        mutationFn: async (subscriptionId) => {
            if (!user)
                throw new Error("Not authenticated");
            const { error } = await supabase
                .from("subscriptions")
                .delete()
                .eq("id", subscriptionId);
            if (error)
                throw error;
        },
        onSettled: () => {
            const userId = useAuthStore.getState().user?.id;
            queryClient.invalidateQueries({ queryKey: ["subscriptions", userId] });
        },
    });
    return {
        subscriptions: subscriptionsQuery.data ?? [],
        isLoading: subscriptionsQuery.isLoading,
        subscribe: subscribeMutation.mutate,
        unsubscribe: unsubscribeMutation.mutate,
        isSubscribing: subscribeMutation.isPending,
    };
}
