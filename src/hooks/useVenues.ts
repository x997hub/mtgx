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
      const { data: venues, error } = await supabase
        .from("venues")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;

      // Get upcoming event counts in one query
      const now = new Date().toISOString();
      const { data: countData } = await supabase
        .from("events")
        .select("venue_id")
        .not("venue_id", "is", null)
        .eq("status", "active")
        .gte("starts_at", now);

      const countMap: Record<string, number> = {};
      if (countData) {
        for (const row of countData) {
          if (row.venue_id) {
            countMap[row.venue_id] = (countMap[row.venue_id] ?? 0) + 1;
          }
        }
      }

      return (venues as Venue[]).map((v) => ({
        ...v,
        upcoming_event_count: countMap[v.id] ?? 0,
      })) as VenueWithEventCount[];
    },
    staleTime: 60_000,
  });
}
