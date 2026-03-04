import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { Database } from "@/types/database.types";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type AvailabilityInsert = Database["public"]["Tables"]["availability"]["Insert"];

export function useProfile(userId?: string) {
  const currentUser = useAuthStore((s) => s.user);
  const id = userId || currentUser?.id;
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const availabilityQuery = useQuery({
    queryKey: ["availability", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .eq("user_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!currentUser) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", currentUser.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: (data, error) => {
      const uid = useAuthStore.getState().user?.id;
      if (!error && data) {
        queryClient.setQueryData(["profile", uid], data);
        useAuthStore.getState().setProfile(data);
      }
      queryClient.invalidateQueries({ queryKey: ["profile", uid] });
    },
  });

  const upsertProfileMutation = useMutation({
    mutationFn: async (profileData: ProfileInsert) => {
      if (!currentUser) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: (data, error) => {
      const uid = useAuthStore.getState().user?.id;
      if (!error && data) {
        queryClient.setQueryData(["profile", uid], data);
        useAuthStore.getState().setProfile(data);
      }
      queryClient.invalidateQueries({ queryKey: ["profile", uid] });
    },
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: async (slots: AvailabilityInsert[]) => {
      if (!currentUser) throw new Error("Not authenticated");
      // Delete existing and re-insert
      const { error: deleteError } = await supabase
        .from("availability")
        .delete()
        .eq("user_id", currentUser.id);
      if (deleteError) throw deleteError;

      if (slots.length > 0) {
        const { error: insertError } = await supabase.from("availability").insert(slots);
        if (insertError) throw insertError;
      }
    },
    onSettled: () => {
      const uid = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["availability", uid] });
    },
  });

  return {
    profile: profileQuery.data,
    availability: availabilityQuery.data ?? [],
    isLoading: profileQuery.isLoading,
    updateProfile: updateProfileMutation.mutateAsync,
    upsertProfile: upsertProfileMutation.mutateAsync,
    updateAvailability: updateAvailabilityMutation.mutateAsync,
    isUpdating:
      updateProfileMutation.isPending ||
      upsertProfileMutation.isPending ||
      updateAvailabilityMutation.isPending,
  };
}
