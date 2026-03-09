import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface WaitlistEntry {
  queue_position: number | null;
  status: string;
}

export function useWaitlist(eventId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  // Realtime subscription for waitlist position updates
  useRealtimeSubscription({
    channelName: `waitlist:${eventId}`,
    table: "rsvps",
    filter: `event_id=eq.${eventId}`,
    enabled: !!eventId,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist", eventId] });
      queryClient.invalidateQueries({ queryKey: ["rsvps", eventId] });
    },
  });

  const waitlistQuery = useQuery({
    queryKey: ["waitlist", eventId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await (supabase
        .from("rsvps")
        .select("queue_position, status")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .eq("status", "waitlisted" as string as "going")
        .maybeSingle() as unknown as Promise<{
          data: WaitlistEntry | null;
          error: { message: string } | null;
        }>);

      if (error) throw error;
      return data;
    },
    enabled: !!eventId && !!user,
  });

  const joinWaitlistMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("join_waitlist", {
        p_event_id: eventId,
        p_user_id: user.id,
      });

      if (error) throw error;
      return data as { status: string; queue_position: number | null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist", eventId] });
      queryClient.invalidateQueries({ queryKey: ["rsvps", eventId] });
    },
  });

  return {
    position: waitlistQuery.data?.queue_position ?? null,
    isWaitlisted: waitlistQuery.data?.status === "waitlisted",
    isLoading: waitlistQuery.isLoading,
    joinWaitlist: joinWaitlistMutation.mutateAsync,
    isJoining: joinWaitlistMutation.isPending,
  };
}
