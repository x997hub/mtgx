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

        {venue.hours && typeof venue.hours === "object" && Object.keys(venue.hours).length > 0 && (
          <div className="flex items-start gap-2 text-sm text-gray-300">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div className="space-y-0.5">
              {Object.entries(venue.hours).map(([day, time]) => (
                <div key={day} className="flex gap-2">
                  <span className="text-gray-400 min-w-[50px]">{day}</span>
                  <span>{time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {venue.capacity && (
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Users className="h-4 w-4 text-gray-400" />
            <span>{t("players_capacity", { count: venue.capacity })}</span>
          </div>
        )}

        {venue.contacts && typeof venue.contacts === "object" && Object.keys(venue.contacts).length > 0 && (
          <div className="flex items-start gap-2 text-sm text-gray-300">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div className="space-y-0.5">
              {Object.entries(venue.contacts).map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <span className="text-gray-400">{label}:</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
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
