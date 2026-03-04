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
                .insert({
                user_id: user.id,
                target_type: targetType,
                target_id: targetId ?? null,
                format: format ?? null,
                city: city ?? null,
            })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["subscriptions", user?.id] });
        },
    });
    const unsubscribeMutation = useMutation({
        mutationFn: async (subscriptionId) => {
            const { error } = await supabase
                .from("subscriptions")
                .delete()
                .eq("id", subscriptionId);
            if (error)
                throw error;
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["subscriptions", user?.id] });
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
