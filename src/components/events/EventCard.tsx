import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { CityBadge } from "@/components/shared/CityBadge";
import type { Database } from "@/types/database.types";

type Event = Database["public"]["Tables"]["events"]["Row"];

interface EventCardProps {
  event: Event & {
    venues?: { name: string; city: string } | null;
    profiles?: { display_name: string } | null;
  };
  rsvpCount?: number;
}

export function EventCard({ event, rsvpCount }: EventCardProps) {
  const { t } = useTranslation("events");

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
            <div className="flex flex-col items-center text-sm text-gray-400">
              <Users className="h-4 w-4" />
              <span>{rsvpCount ?? 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
