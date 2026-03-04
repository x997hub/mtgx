import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
export function useProfile(userId) {
    const currentUser = useAuthStore((s) => s.user);
    const id = userId || currentUser?.id;
    const queryClient = useQueryClient();
    const profileQuery = useQuery({
        queryKey: ["profile", id],
        queryFn: async () => {
            if (!id)
                return null;
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", id)
                .single();
            if (error)
                throw error;
            return data;
        },
        enabled: !!id,
    });
    const availabilityQuery = useQuery({
        queryKey: ["availability", id],
        queryFn: async () => {
            if (!id)
                return [];
            const { data, error } = await supabase
                .from("availability")
                .select("*")
                .eq("user_id", id);
            if (error)
                throw error;
            return data;
        },
        enabled: !!id,
    });
    const updateProfileMutation = useMutation({
        mutationFn: async (updates) => {
            if (!currentUser)
                throw new Error("Not authenticated");
            const { data, error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", currentUser.id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["profile", currentUser?.id], data);
            useAuthStore.getState().setProfile(data);
        },
    });
    const updateAvailabilityMutation = useMutation({
        mutationFn: async (slots) => {
            if (!currentUser)
                throw new Error("Not authenticated");
            // Delete existing and re-insert
            await supabase.from("availability").delete().eq("user_id", currentUser.id);
            if (slots.length > 0) {
                const { error } = await supabase.from("availability").insert(slots);
                if (error)
                    throw error;
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["availability", currentUser?.id] });
        },
    });
    return {
        profile: profileQuery.data,
        availability: availabilityQuery.data ?? [],
        isLoading: profileQuery.isLoading,
        updateProfile: updateProfileMutation.mutateAsync,
        updateAvailability: updateAvailabilityMutation.mutateAsync,
        isUpdating: updateProfileMutation.isPending || updateAvailabilityMutation.isPending,
    };
}
