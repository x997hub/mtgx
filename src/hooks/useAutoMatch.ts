import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { AutoMatchPreferencesInsert, AutoMatchPreferencesUpdate } from "@/types/database.types";

export function useAutoMatch() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const prefsQuery = useQuery({
    queryKey: ["auto-match", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("auto_match_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const upsertMutation = useMutation({
    mutationFn: async (prefs: AutoMatchPreferencesInsert | AutoMatchPreferencesUpdate) => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("auto_match_preferences")
        .upsert({ ...prefs, user_id: currentUser.id }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      const uid = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["auto-match", uid] });
    },
  });

  return {
    prefs: prefsQuery.data,
    isLoading: prefsQuery.isLoading,
    upsert: upsertMutation.mutateAsync,
    isUpdating: upsertMutation.isPending,
  };
}
