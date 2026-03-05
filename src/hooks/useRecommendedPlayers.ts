import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useRecommendedPlayers(eventId: string | null) {
  const queryClient = useQueryClient();

  const recommendedQuery = useQuery({
    queryKey: ["recommended", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase.rpc("get_recommended_invites", {
        p_event_id: eventId,
      });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!eventId,
  });

  const sendBulkMutation = useMutation({
    mutationFn: async ({
      eventId: eid,
      userIds,
      message,
    }: {
      eventId: string;
      userIds: string[];
      message?: string;
    }) => {
      const { data, error } = await supabase.rpc("send_bulk_invites", {
        p_event_id: eid,
        p_user_ids: userIds,
        p_message: message || null,
      });
      if (error) throw error;
      return data as unknown as { invited: number };
    },
    onSettled: () => {
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: ["recommended", eventId] });
      }
    },
  });

  return {
    players: recommendedQuery.data ?? [],
    isLoading: recommendedQuery.isLoading,
    sendBulkInvites: sendBulkMutation.mutateAsync,
    isSending: sendBulkMutation.isPending,
  };
}
