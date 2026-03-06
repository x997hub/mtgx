import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

interface WaitlistEntry {
  queue_position: number | null;
  status: string;
}

export function useWaitlist(eventId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  // Realtime subscription for waitlist position updates
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`waitlist:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rsvps",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["waitlist", eventId] });
          queryClient.invalidateQueries({ queryKey: ["rsvps", eventId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  const waitlistQuery = useQuery({
    queryKey: ["waitlist", eventId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      // queue_position column may not yet be in database.types.ts (added by another agent)
      const { data, error } = await (supabase
        .from("rsvps")
        .select("queue_position, status" as "*")
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

  return {
    position: waitlistQuery.data?.queue_position ?? null,
    isWaitlisted: waitlistQuery.data?.status === "waitlisted",
    isLoading: waitlistQuery.isLoading,
  };
}
