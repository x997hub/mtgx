import { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Navigation } from "lucide-react";
import { VenuePhotoGallery } from "./VenuePhotoGallery";
import type { Venue, VenuePhoto } from "@/types/database.types";

const DirectionsMap = lazy(() => import("./DirectionsMap"));

interface VenueDirectionsProps {
  venue: Venue;
  locationPhotos: VenuePhoto[];
}

export function VenueDirections({
  venue,
  locationPhotos,
}: VenueDirectionsProps) {
  const { t } = useTranslation("venue");

  const hasCoords = venue.latitude != null && venue.longitude != null;
  const hasContent =
    hasCoords ||
    venue.directions_description ||
    venue.nearby_landmarks ||
    venue.google_business_url ||
    locationPhotos.length > 0;

  if (!hasContent) return null;

  const googleMapsUrl =
    venue.google_business_url ||
    (hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`
      : null);
  const wazeUrl = hasCoords
    ? `https://www.waze.com/ul?ll=${venue.latitude},${venue.longitude}&navigate=yes`
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-text-secondary">
          <MapPin className="h-5 w-5" />
          {t("how_to_find")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasCoords && (
          <Suspense
            fallback={<Skeleton className="h-[200px] w-full rounded-lg" />}
          >
            <DirectionsMap
              lat={venue.latitude!}
              lng={venue.longitude!}
              name={venue.name}
            />
          </Suspense>
        )}

        {(googleMapsUrl || wazeUrl) && (
          <div className="flex gap-2">
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full" size="sm">
                  <Navigation className="me-2 h-4 w-4" />
                  {t("open_in_google_maps")}
                </Button>
              </a>
            )}
            {wazeUrl && (
              <a
                href={wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full" size="sm">
                  <Navigation className="me-2 h-4 w-4" />
                  {t("open_in_waze")}
                </Button>
              </a>
            )}
          </div>
        )}

        {venue.directions_description && (
          <div>
            <p className="text-sm font-medium text-text-secondary mb-1">
              {t("directions_description")}
            </p>
            <p className="text-sm text-text-primary whitespace-pre-line">
              {venue.directions_description}
            </p>
          </div>
        )}

        {venue.nearby_landmarks && (
          <div>
            <p className="text-sm font-medium text-text-secondary mb-1">
              {t("nearby_landmarks")}
            </p>
            <p className="text-sm text-text-primary whitespace-pre-line">
              {venue.nearby_landmarks}
            </p>
          </div>
        )}

        <VenuePhotoGallery
          photos={locationPhotos}
          title={t("location_photos")}
        />
      </CardContent>
    </Card>
  );
}
