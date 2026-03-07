import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useFilterStore } from "@/store/filterStore";
import type { Database } from "@/types/database.types";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];

export type EventWithRelations = Database["public"]["Tables"]["events"]["Row"] & {
  venues?: { name: string; city: string } | null;
  profiles?: { display_name: string } | null;
  rsvps?: { count: number }[];
};

const PAGE_SIZE = 20;

export function useEvents() {
  const { format, city } = useFilterStore();
  const queryClient = useQueryClient();

  const eventsQuery = useInfiniteQuery({
    queryKey: ["events", { format, city }],
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
      const { data, error } = await supabase
        .from("events")
        .insert(event)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  return {
    events: eventsQuery.data?.pages.flat() ?? [],
    isLoading: eventsQuery.isLoading,
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
        .select("*, profiles(display_name)" as "*")
        .eq("event_id", eventId);
      if (error) throw error;
      return data as unknown as (Database["public"]["Tables"]["rsvps"]["Row"] & {
        profiles?: { display_name: string } | null;
      })[];
    },
    enabled: !!eventId,
  });
}
