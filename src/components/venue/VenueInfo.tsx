import { useTranslation } from "react-i18next";
import { MapPin, Clock, Users, Phone } from "lucide-react";
import { FormatBadge } from "@/components/shared/FormatBadge";
import type { Database } from "@/types/database.types";

type Venue = Database["public"]["Tables"]["venues"]["Row"];

interface VenueInfoProps {
  venue: Venue;
}

export function VenueInfo({ venue }: VenueInfoProps) {
  const { t } = useTranslation("venue");

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-start gap-2 text-sm text-gray-300">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <span>{venue.address}</span>
        </div>

        {venue.hours && (
          <div className="flex items-start gap-2 text-sm text-gray-300">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <span>{typeof venue.hours === "string" ? venue.hours : JSON.stringify(venue.hours)}</span>
          </div>
        )}

        {venue.capacity && (
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Users className="h-4 w-4 text-gray-400" />
            <span>{t("players_capacity", { count: venue.capacity })}</span>
          </div>
        )}

        {venue.contacts && (
          <div className="flex items-start gap-2 text-sm text-gray-300">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <span>{typeof venue.contacts === "string" ? venue.contacts : JSON.stringify(venue.contacts)}</span>
          </div>
        )}
      </div>

      {venue.supported_formats.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400">{t("supported_formats")}</h3>
          <div className="flex flex-wrap gap-2">
            {venue.supported_formats.map((format) => (
              <FormatBadge key={format} format={format} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
