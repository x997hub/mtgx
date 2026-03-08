import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Venue } from "@/types/database.types";

export type VenueWithEventCount = Venue & {
  upcoming_event_count: number;
};

export function useVenues() {
  return useQuery({
    queryKey: ["venues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*, events!events_venue_id_fkey(count)" as "*")
        .order("name", { ascending: true });
      if (error) throw error;

      const now = new Date().toISOString();

      // Get upcoming event counts per venue
      const venueIds = (data as Venue[]).map((v) => v.id);
      let countMap: Record<string, number> = {};

      if (venueIds.length > 0) {
        const { data: countData, error: countError } = await supabase
          .from("events")
          .select("venue_id")
          .in("venue_id", venueIds)
          .eq("status", "active")
          .gte("starts_at", now);
        if (!countError && countData) {
          for (const row of countData) {
            if (row.venue_id) {
              countMap[row.venue_id] = (countMap[row.venue_id] ?? 0) + 1;
            }
          }
        }
      }

      return (data as Venue[]).map((v) => ({
        ...v,
        upcoming_event_count: countMap[v.id] ?? 0,
      })) as VenueWithEventCount[];
    },
    staleTime: 60_000,
  });
}
