import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { VenueCard } from "@/components/venue/VenueCard";
import { useVenues } from "@/hooks/useVenues";

// Fix Leaflet default marker icons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER: [number, number] = [32.0853, 34.7818]; // Tel Aviv

function FlyToUser() {
  const map = useMap();

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, {
          duration: 1.5,
        });
      },
      () => {
        // Geolocation denied or unavailable — stay at default
      }
    );
  }, [map]);

  return null;
}

export default function ClubsPage() {
  const { t } = useTranslation(["common", "venue"]);
  const { data: venues, isLoading, isError } = useVenues();
  const [mapReady, setMapReady] = useState(false);

  const venuesWithCoords = venues?.filter(
    (v) => v.latitude != null && v.longitude != null
  );

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <h1 className="text-2xl font-bold text-text-primary">
        {t("venue:clubs_map")}
      </h1>

      {/* Map */}
      <div className="h-[400px] w-full overflow-hidden rounded-lg border border-border">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={10}
            className="h-full w-full"
            whenReady={() => setMapReady(true)}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapReady && <FlyToUser />}
            {venuesWithCoords?.map((venue) => (
              <Marker
                key={venue.id}
                position={[venue.latitude!, venue.longitude!]}
              >
                <Popup>
                  <div className="space-y-1">
                    <p className="font-semibold">{venue.name}</p>
                    <p className="text-sm text-gray-600">{venue.city}</p>
                    <Link to={`/venues/${venue.id}`}>
                      <Button size="sm" className="mt-1 w-full">
                        {t("venue:open_venue")}
                      </Button>
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {venuesWithCoords && venuesWithCoords.length === 0 && venues && venues.length > 0 && (
        <p className="text-sm text-text-secondary text-center">
          {t("venue:no_coords")}
        </p>
      )}

      {/* Venue list */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && <EmptyState title={t("common:error_occurred")} />}

      {venues && venues.length === 0 && (
        <EmptyState icon={Building2} title={t("venue:no_clubs")} />
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
