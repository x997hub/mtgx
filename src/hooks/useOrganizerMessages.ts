import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";

interface OrganizerMessage {
  id: number;
  event_id: string;
  organizer_id: string;
  body: string;
  created_at: string;
}

export function useOrganizerMessages(eventId: string) {
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["organizer-messages", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizer_messages")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as OrganizerMessage[];
    },
    enabled: !!eventId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiFetch("/event-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, message }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to send message");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizer-messages", eventId] });
    },
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
  };
}
