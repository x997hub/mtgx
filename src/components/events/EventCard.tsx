import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { CityBadge } from "@/components/shared/CityBadge";
import type { EventWithRelations } from "@/hooks/useEvents";

interface EventCardProps {
  event: EventWithRelations;
}

export function EventCard({ event }: EventCardProps) {
  const { t } = useTranslation("events");

  const goingCount = event.rsvps?.[0]?.count ?? 0;
  const spotsLeft = event.max_players != null ? event.max_players - goingCount : null;

  const date = new Date(event.starts_at);
  const timeStr = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const hourStr = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link to={`/events/${event.id}`}>
      <Card className="transition-colors hover:border-[#e94560]/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <FormatBadge format={event.format} />
                <CityBadge city={event.city} />
              </div>
              <h3 className="font-semibold text-gray-100">
                {event.title || t(event.type === "big" ? "big_event" : "quick_meetup")}
              </h3>
              <div className="flex flex-col gap-1 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {timeStr} {hourStr}
                </span>
                {event.venues && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.venues.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5 text-sm text-gray-400">
              <Users className="h-4 w-4" />
              <span>{goingCount}</span>
              {spotsLeft != null && (
                <span className={`text-xs ${spotsLeft <= 0 ? "text-red-400" : "text-gray-500"}`}>
                  {spotsLeft <= 0
                    ? t("event_full")
                    : t("spots_left", { count: spotsLeft })}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
