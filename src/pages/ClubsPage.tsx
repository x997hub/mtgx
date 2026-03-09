import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { VenueCard } from "@/components/venue/VenueCard";
import { useVenues } from "@/hooks/useVenues";

export default function ClubsPage() {
  const { t } = useTranslation(["common", "venue"]);
  const { data: venues, isLoading, isError } = useVenues();

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <h1 className="text-2xl font-bold text-text-primary">{t("common:clubs")}</h1>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState title={t("common:error_occurred")} />
      )}

      {venues && venues.length === 0 && (
        <EmptyState
          icon={Building2}
          title={t("venue:no_clubs")}
        />
      )}

      {venues && venues.length > 0 && (
        <div className="space-y-4">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  );
}
