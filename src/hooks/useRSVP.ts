import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";

interface RSVPParams {
  eventId: string;
  status: "going" | "maybe" | "not_going";
  powerLevel?: number | null;
}

interface RSVPResponse {
  rsvp: {
    event_id: string;
    user_id: string;
    status: string;
    queue_position?: number | null;
    power_level?: number | null;
    [key: string]: unknown;
  };
  error?: string;
}

export function useRSVP() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async ({ eventId, status, powerLevel }: RSVPParams) => {
      if (!user || !session) throw new Error("Not authenticated");

      const body: Record<string, unknown> = { event_id: eventId, status };
      if (powerLevel !== undefined && powerLevel !== null) {
        body.power_level = powerLevel;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mtgx-api/rsvp`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      const data: RSVPResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "RSVP failed");
      }

      return data.rsvp;
    },
    onMutate: async ({ eventId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["rsvps", eventId] });
      const previous = queryClient.getQueryData(["rsvps", eventId]);
      const userId = user?.id;
      if (!userId) return { previous };

      queryClient.setQueryData(["rsvps", eventId], (old: unknown) => {
        if (!Array.isArray(old)) return old;
        const existing = old.find(
          (r) => (r as { user_id: string }).user_id === userId,
        );
        if (existing) {
          return old.map((r) => {
            const item = r as { user_id: string; status: string };
            return item.user_id === userId ? { ...item, status } : item;
          });
        }
        return [
          ...old,
          {
            user_id: userId,
            event_id: eventId,
            status,
            profiles: {
              display_name: user?.user_metadata?.full_name ?? "You",
            },
          },
        ];
      });
      return { previous };
    },
    onSuccess: (data, { eventId }) => {
      // If the server returned a different status (e.g. waitlisted instead of going),
      // update the cache to reflect the actual status
      const userId = user?.id;
      if (!userId) return;

      queryClient.setQueryData(["rsvps", eventId], (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((r) => {
          const item = r as {
            user_id: string;
            status: string;
            queue_position?: number | null;
          };
          return item.user_id === userId
            ? {
                ...item,
                status: data.status,
                queue_position: data.queue_position,
              }
            : item;
        });
      });
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
