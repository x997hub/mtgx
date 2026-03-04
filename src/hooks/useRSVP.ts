import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { Database } from "@/types/database.types";

type RsvpStatus = Database["public"]["Enums"]["rsvp_status"];

interface RSVPParams {
  eventId: string;
  status: RsvpStatus;
}

export function useRSVP() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ eventId, status }: RSVPParams) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("rsvps")
        .upsert(
          { event_id: eventId, user_id: user.id, status, updated_at: new Date().toISOString() },
          { onConflict: "event_id,user_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ eventId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["rsvps", eventId] });
      const previous = queryClient.getQueryData(["rsvps", eventId]);
      const userId = user?.id;
      queryClient.setQueryData(["rsvps", eventId], (old: unknown[]) => {
        if (!Array.isArray(old)) return old;
        return old.map((r) => {
          const item = r as { user_id: string; status: string };
          return item.user_id === userId ? { ...item, status } : item;
        });
      });
      return { previous };
    },
    onError: (_err, { eventId }, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["rsvps", eventId], context.previous);
      }
    },
    onSettled: (_data, _err, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["rsvps", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
  });
}
