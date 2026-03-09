import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useFilterStore } from "@/store/filterStore";
import { useAuthStore } from "@/store/authStore";
import { apiFetch } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import type { Database } from "@/types/database.types";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];

export type EventWithRelations = Database["public"]["Tables"]["events"]["Row"] & {
  venues?: { name: string; city: string } | null;
  profiles?: { display_name: string } | null;
  rsvps?: { count: number }[];
};

const PAGE_SIZE = 20;

export function useEvents() {
  const format = useFilterStore((s) => s.format);
  const city = useFilterStore((s) => s.city);
  const proxyPolicy = useFilterStore((s) => s.proxyPolicy);
  const queryClient = useQueryClient();

  const eventsQuery = useInfiniteQuery({
    queryKey: ["events", { format, city, proxyPolicy }],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("events")
        .select("*, venues(name, city), profiles!events_organizer_id_fkey(display_name), rsvps(count)" as "*")
        .eq("status", "active")
        .eq("rsvps.status", "going")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (format) query = query.eq("format", format);
      if (city) query = query.eq("city", city);
      if (proxyPolicy) query = query.eq("proxy_policy", proxyPolicy);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as EventWithRelations[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    refetchInterval: 60000,
  });

  const createEventMutation = useMutation({
    mutationFn: async (event: EventInsert) => {
      const session = useAuthStore.getState().session;
      if (!session) throw new Error("Not authenticated");

      const res = await apiFetch("/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(15000),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create event");
      }
      return data.event;
    },
    onError: () => {
      toast({ title: "Something went wrong", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  return {
    events: eventsQuery.data?.pages.flat() ?? [],
    isLoading: eventsQuery.isLoading,
    isError: eventsQuery.isError,
    refetch: eventsQuery.refetch,
    fetchNextPage: eventsQuery.fetchNextPage,
    hasNextPage: eventsQuery.hasNextPage,
    isFetchingNextPage: eventsQuery.isFetchingNextPage,
    createEvent: createEventMutation.mutateAsync,
    isCreating: createEventMutation.isPending,
  };
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, venues(name, city, address), profiles!events_organizer_id_fkey(display_name)" as "*")
        .eq("id", eventId)
        .single();
      if (error) throw error;
      return data as unknown as Database["public"]["Tables"]["events"]["Row"] & {
        venues?: { name: string; city: string; address: string } | null;
        profiles?: { display_name: string } | null;
      };
    },
    enabled: !!eventId,
  });
}

export function useEventRsvps(eventId: string) {
  const queryClient = useQueryClient();

  // Supabase Realtime subscription for live attendee count updates
  useRealtimeSubscription({
    channelName: `rsvps:${eventId}`,
    table: "rsvps",
    filter: `event_id=eq.${eventId}`,
    enabled: !!eventId,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["rsvps", eventId] });
    },
  });

  return useQuery({
    queryKey: ["rsvps", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rsvps")
        .select("*, profiles(display_name, playstyle)" as "*")
        .eq("event_id", eventId);
      if (error) throw error;
      return data as unknown as (Database["public"]["Tables"]["rsvps"]["Row"] & {
        profiles?: { display_name: string; playstyle?: string | null } | null;
      })[];
    },
    enabled: !!eventId,
  });
}
