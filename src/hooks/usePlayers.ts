import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database, MtgFormat, DayOfWeek } from "@/types/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type AvailabilityRow = Database["public"]["Tables"]["availability"]["Row"];

export interface PlayerFilters {
  format: MtgFormat | null;
  city: string | null;
  day: DayOfWeek | null;
  venueId: string | null;
}

const PAGE_SIZE = 20;

export function usePlayers(filters: PlayerFilters) {
  const { format, city, day, venueId } = filters;

  const playersQuery = useInfiniteQuery({
    queryKey: ["players", { format, city, day, venueId }],
    queryFn: async ({ pageParam = 0 }) => {
      let userIdFilter: string[] | null = null;

      // Filter by availability day
      if (day) {
        const { data: avail } = await supabase
          .from("availability")
          .select("user_id")
          .eq("day", day)
          .in("level", ["available", "sometimes"]);
        userIdFilter = avail?.map((a) => a.user_id) ?? [];
      }

      // Filter by venue (players who RSVP'd to events at this venue)
      if (venueId) {
        const { data: rsvps } = await supabase
          .from("rsvps")
          .select("user_id, events!inner(venue_id)" as "user_id")
          .eq("events.venue_id" as "user_id", venueId)
          .eq("status", "going");
        const venueUserIds = [
          ...new Set((rsvps as unknown as { user_id: string }[])?.map((r) => r.user_id) ?? []),
        ];
        if (userIdFilter) {
          userIdFilter = userIdFilter.filter((id) => venueUserIds.includes(id));
        } else {
          userIdFilter = venueUserIds;
        }
      }

      // No matching users for sub-filters — return empty
      if (userIdFilter !== null && userIdFilter.length === 0) {
        return [] as ProfileRow[];
      }

      let query = supabase
        .from("profiles")
        .select("*")
        .order("display_name", { ascending: true })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (format) query = query.contains("formats", [format]);
      if (city) query = query.eq("city", city);
      if (userIdFilter) query = query.in("id", userIdFilter);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
  });

  const playerIds = playersQuery.data?.pages.flat().map((p) => p.id) ?? [];

  // Batch-fetch availability for all visible players
  const availabilityQuery = useQuery({
    queryKey: ["players-availability", playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) return [] as AvailabilityRow[];
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .in("user_id", playerIds)
        .in("level", ["available", "sometimes"]);
      if (error) throw error;
      return (data ?? []) as AvailabilityRow[];
    },
    enabled: playerIds.length > 0,
  });

  // Group availability by user_id
  const availabilityMap = new Map<string, AvailabilityRow[]>();
  for (const row of availabilityQuery.data ?? []) {
    const list = availabilityMap.get(row.user_id) ?? [];
    list.push(row);
    availabilityMap.set(row.user_id, list);
  }

  return {
    players: playersQuery.data?.pages.flat() ?? [],
    availabilityMap,
    isLoading: playersQuery.isLoading,
    fetchNextPage: playersQuery.fetchNextPage,
    hasNextPage: playersQuery.hasNextPage,
    isFetchingNextPage: playersQuery.isFetchingNextPage,
  };
}

export function useVenuesList() {
  return useQuery({
    queryKey: ["venues-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id, name, city")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
