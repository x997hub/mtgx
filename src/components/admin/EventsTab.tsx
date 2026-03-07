import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Database, EventStatus } from "@/types/database.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { EVENT_STATUS_COLORS } from "@/lib/constants";

const STATUSES: EventStatus[] = ["active", "confirmed", "cancelled", "expired"];

type EventRow = Database["public"]["Tables"]["events"]["Row"] & {
  profiles?: { display_name: string } | null;
  rsvps?: { count: number }[];
};

export function EventsTab() {
  const { t } = useTranslation(["common", "events"]);
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");

  const { data: events, isLoading, isError } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, profiles!events_organizer_id_fkey(display_name), rsvps(count)" as "*")
        .order("starts_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as EventRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!events) return [];
    if (statusFilter === "all") return events;
    return events.filter((e) => e.status === statusFilter);
  }, [events, statusFilter]);

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
    <div className="space-y-3 mt-4">
      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-accent text-white"
              : "bg-surface-hover text-text-secondary"
          }`}
        >
          {t("common:all", "All")} ({events?.length ?? 0})
        </button>
        {STATUSES.map((s) => {
          const count = events?.filter((e) => e.status === s).length ?? 0;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-accent text-white"
                  : "bg-surface-hover text-text-secondary"
              }`}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* Count */}
      <p className="text-sm text-text-secondary">
        {filtered.length} {t("common:events").toLowerCase()}
      </p>

      {/* Event list */}
      {filtered.length === 0 && (
        <p className="p-4 text-center text-text-secondary">{t("common:no_results")}</p>
      )}
      {filtered.map((evt) => {
        const title = evt.title || t("events:quick_format", { format: evt.format });
        const organizer = evt.profiles?.display_name;
        const goingCount = evt.rsvps?.[0]?.count ?? 0;
        const isPast = new Date(evt.starts_at) < new Date();

        return (
          <Card key={evt.id} className={`bg-surface-card border-surface-hover ${isPast ? "opacity-60" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FormatBadge format={evt.format} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary truncate">{title}</p>
                      <Link
                        to={`/events/${evt.id}`}
                        className="text-text-secondary hover:text-accent shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {new Date(evt.starts_at).toLocaleDateString()} — {evt.city}
                      {organizer && <> — {organizer}</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* RSVP count */}
                  <div className="flex items-center gap-1 text-sm text-text-secondary">
                    <Users className="h-3.5 w-3.5" />
                    <span>{goingCount}{evt.max_players ? `/${evt.max_players}` : ""}</span>
                  </div>
                  <Badge
                    className={`border-none ${EVENT_STATUS_COLORS[evt.status as EventStatus] ?? "bg-gray-700 text-gray-300"}`}
                  >
                    {evt.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
