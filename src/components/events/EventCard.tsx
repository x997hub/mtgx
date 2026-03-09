import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { CityBadge } from "@/components/shared/CityBadge";
import { CircularProgress } from "@/components/shared/CircularProgress";
import { MoodTagBadge } from "@/components/events/MoodTagBadge";
import { ProxyPolicyBadge } from "@/components/events/ProxyPolicyBadge";
import { RecurringBadge } from "@/components/events/RecurringBadge";
import type { EventWithRelations } from "@/hooks/useEvents";

interface EventCardProps {
  event: EventWithRelations;
}

export function EventCard({ event }: EventCardProps) {
  const { t } = useTranslation("events");

  const goingCount = event.rsvps?.[0]?.count ?? 0;
  const maxPlayers = event.max_players;

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
      <Card className="transition-colors hover:border-accent/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <FormatBadge format={event.format} />
                <CityBadge city={event.city} />
                {event.proxy_policy && event.proxy_policy !== "none" && (
                  <ProxyPolicyBadge policy={event.proxy_policy} />
                )}
                {event.template_id && <RecurringBadge />}
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                {event.title || t(event.type === "big" ? "big_event" : "quick_meetup")}
              </h3>
              {/* Mood tags */}
              {event.mood_tags && event.mood_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {event.mood_tags.map((tag) => (
                    <MoodTagBadge key={tag} tag={tag} />
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-1 text-base text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {timeStr} {hourStr}
                </span>
                {event.venues && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {event.venues.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              {maxPlayers != null ? (
                <CircularProgress value={goingCount} max={maxPlayers} size={44} />
              ) : (
                <span className="text-base text-text-secondary">{goingCount}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
