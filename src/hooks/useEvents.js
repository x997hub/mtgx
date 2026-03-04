import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFilterStore } from "@/store/filterStore";
const PAGE_SIZE = 20;
export function useEvents() {
    const { format, city } = useFilterStore();
    const queryClient = useQueryClient();
    const eventsQuery = useInfiniteQuery({
        queryKey: ["events", { format, city }],
        queryFn: async ({ pageParam = 0 }) => {
            let query = supabase
                .from("events")
                .select("*, venues(name, city), profiles!events_organizer_id_fkey(display_name), rsvps(count)")
                .eq("status", "active")
                .gte("starts_at", new Date().toISOString())
                .order("starts_at", { ascending: true })
                .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);
            if (format)
                query = query.eq("format", format);
            if (city)
                query = query.eq("city", city);
            const { data, error } = await query;
            if (error)
                throw error;
            return data;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => lastPage.length === PAGE_SIZE ? allPages.length : undefined,
        refetchInterval: 60000,
    });
    const createEventMutation = useMutation({
        mutationFn: async (event) => {
            const { data, error } = await supabase
                .from("events")
                .insert(event)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
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
export function useEvent(eventId) {
    return useQuery({
        queryKey: ["event", eventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("events")
                .select("*, venues(name, city, address), profiles!events_organizer_id_fkey(display_name)")
                .eq("id", eventId)
                .single();
            if (error)
                throw error;
            return data;
        },
        enabled: !!eventId,
    });
}
export function useEventRsvps(eventId) {
    const queryClient = useQueryClient();
    // Supabase Realtime subscription for live attendee count updates
    useEffect(() => {
        if (!eventId)
            return;
        const channel = supabase
            .channel(`rsvps:${eventId}`)
            .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "rsvps",
            filter: `event_id=eq.${eventId}`,
        }, () => {
            // Invalidate the query to refetch attendee list
            queryClient.invalidateQueries({ queryKey: ["rsvps", eventId] });
        })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [eventId, queryClient]);
    return useQuery({
        queryKey: ["rsvps", eventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("rsvps")
                .select("*, profiles(display_name)")
                .eq("event_id", eventId);
            if (error)
                throw error;
            return data;
        },
        enabled: !!eventId,
    });
}
