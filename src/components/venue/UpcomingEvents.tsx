import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Calendar } from "lucide-react";

interface UpcomingEventsProps {
  venueId: string;
}

export function UpcomingEvents({ venueId }: UpcomingEventsProps) {
  const { t } = useTranslation("venue");

  const { data: events, isLoading } = useQuery({
    queryKey: ["venue-events", venueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("venue_id", venueId)
        .eq("status", "active")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!venueId,
  });

  if (isLoading) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-100">{t("upcoming_events")}</h2>
      {events && events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event as any} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title={t("no_upcoming_events")}
        />
      )}
    </div>
  );
}
