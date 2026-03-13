import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { CityBadge } from "@/components/shared/CityBadge";
import type { VenueWithEventCount } from "@/hooks/useVenues";

interface VenueCardProps {
  venue: VenueWithEventCount;
}

export function VenueCard({ venue }: VenueCardProps) {
  const { t } = useTranslation(["venue", "common"]);

  return (
    <Link to={`/venues/${venue.id}`} className="block">
      <Card className="transition-colors hover:border-accent/50">
        <CardContent className="p-4 space-y-2.5">
          {/* Name + City */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              {venue.logo_url ? (
                <img src={venue.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent text-sm font-bold">
                  {venue.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="text-lg font-semibold text-text-primary truncate">
                {venue.name}
              </h3>
            </div>
            <CityBadge city={venue.city} className="shrink-0" />
          </div>

          {/* Formats */}
          {venue.supported_formats.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {venue.supported_formats.map((f) => (
                <FormatBadge key={f} format={f} className="text-xs px-2 py-0" />
              ))}
            </div>
          )}

          {/* Address + Events count */}
          <div className="flex items-center justify-between gap-3 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {venue.address}
            </span>
            {venue.upcoming_event_count > 0 && (
              <Badge className="border-none bg-accent/15 text-accent shrink-0">
                <Calendar className="h-3 w-3 me-1" />
                {venue.upcoming_event_count} {t("venue:events_count", { count: venue.upcoming_event_count })}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
