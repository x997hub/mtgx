import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { InvitePreferencesInsert, InvitePreferencesUpdate } from "@/types/database.types";

export function useInvitePreferences(userId?: string) {
  const currentUser = useAuthStore((s) => s.user);
  const id = userId || currentUser?.id;
  const queryClient = useQueryClient();

  const prefsQuery = useQuery({
    queryKey: ["invite-prefs", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("invite_preferences")
        .select("*")
        .eq("user_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (prefs: InvitePreferencesInsert | InvitePreferencesUpdate) => {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("invite_preferences")
        .upsert({ ...prefs, user_id: user.id }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      const uid = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["invite-prefs", uid] });
    },
  });

  const updateDndMutation = useMutation({
    mutationFn: async (dndUntil: string | null) => {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("invite_preferences")
        .upsert(
          { user_id: user.id, dnd_until: dndUntil },
          { onConflict: "user_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      const uid = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["invite-prefs", uid] });
    },
  });

  return {
    prefs: prefsQuery.data,
    isLoading: prefsQuery.isLoading,
    upsert: upsertMutation.mutateAsync,
    updateDnd: updateDndMutation.mutateAsync,
    isUpdating: upsertMutation.isPending || updateDndMutation.isPending,
  };
}
