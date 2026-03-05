import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MtgFormat } from "@/types/database.types";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function deriveSlotFromDatetime(startsAt: string): { day: string; slot: string } | null {
  if (!startsAt) return null;
  const date = new Date(startsAt);
  if (isNaN(date.getTime())) return null;
  const day = DAY_NAMES[date.getDay()];
  const hour = date.getHours();
  const slot = hour < 17 ? "day" : "evening";
  return { day, slot };
}

export function useAvailablePlayersCount(
  city: string,
  format: MtgFormat | "",
  startsAt: string
) {
  const derived = deriveSlotFromDatetime(startsAt);

  return useQuery({
    queryKey: ["available-count", city, format, derived?.day, derived?.slot],
    queryFn: async () => {
      if (!derived || !city || !format) return 0;
      const { data, error } = await supabase.rpc("count_available_players", {
        p_city: city,
        p_format: format,
        p_day: derived.day,
        p_slot: derived.slot,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    enabled: !!city && !!format && !!derived,
    staleTime: 5 * 60 * 1000,
  });
}
