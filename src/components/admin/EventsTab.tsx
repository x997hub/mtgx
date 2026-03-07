import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database, EventStatus } from "@/types/database.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { EVENT_STATUS_COLORS } from "@/lib/constants";

export function EventsTab() {
  const { t } = useTranslation(["common", "events"]);
  const { data: events, isLoading, isError } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, profiles!events_organizer_id_fkey(display_name)" as "*")
        .order("starts_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as (Database["public"]["Tables"]["events"]["Row"] & {
        profiles?: { display_name: string } | null;
      })[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="p-4 text-red-400">{t("common:error_occurred")}</p>;
  }

  return (
    <div className="space-y-2 mt-4">
      {events && events.length === 0 && (
        <p className="p-4 text-center text-text-secondary">{t("common:no_results")}</p>
      )}
      {events?.map((evt) => {
        const title = evt.title || t("events:quick_format", { format: evt.format });
        const organizer = evt.profiles?.display_name;

        return (
          <Card key={evt.id} className="bg-surface-card border-surface-hover">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FormatBadge format={evt.format} />
                <div>
                  <p className="font-medium text-text-primary">{title}</p>
                  <p className="text-base text-text-secondary">
                    {new Date(evt.starts_at).toLocaleDateString()} — {evt.city}
                    {organizer && <> — {organizer}</>}
                  </p>
                </div>
              </div>
              <Badge
                className={`border-none ${EVENT_STATUS_COLORS[evt.status as EventStatus] ?? "bg-gray-700 text-gray-300"}`}
              >
                {evt.status}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
