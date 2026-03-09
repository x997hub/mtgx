import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { CityBadge } from "@/components/shared/CityBadge";
import { SubscribeButton } from "@/components/shared/SubscribeButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { EventCard } from "@/components/events/EventCard";
import type { Venue, VenuePhoto } from "@/types/database.types";
import type { EventWithRelations } from "@/hooks/useEvents";
import { useAuthStore } from "@/store/authStore";
import { VenueAnalytics } from "@/components/venue/VenueAnalytics";
import { MapPin, Clock, Users, Phone, Calendar } from "lucide-react";

const VENUE_IMAGES_BUCKET = "venue-images";

export default function VenuePage() {
  const { t } = useTranslation("venue");
  const { t: tc } = useTranslation("common");
  const { id: venueId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const venueQuery = useQuery({
    queryKey: ["venue", venueId],
    queryFn: async () => {
      if (!venueId) return null;
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", venueId)
        .maybeSingle();
      if (error) throw error;
      return data as Venue;
    },
    enabled: !!venueId,
  });

  const eventsQuery = useQuery({
    queryKey: ["venue-events", venueId],
    queryFn: async () => {
      if (!venueId) return [];
      const { data, error } = await supabase
        .from("events")
        .select("*, venues(name, city), profiles!events_organizer_id_fkey(display_name), rsvps(count)" as "*")
        .eq("venue_id", venueId)
        .eq("status", "active")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data as unknown as EventWithRelations[];
    },
    enabled: !!venueId,
  });

  const photosQuery = useQuery({
    queryKey: ["venue-photos", venueId],
    queryFn: async () => {
      if (!venueId) return [];
      const { data, error } = await supabase
        .from("venue_photos")
        .select("*")
        .eq("venue_id", venueId)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data as VenuePhoto[];
    },
    enabled: !!venueId,
  });

  const primaryPhoto = photosQuery.data?.find((p) => p.is_primary) ?? photosQuery.data?.[0];
  const primaryPhotoUrl = primaryPhoto
    ? supabase.storage.from(VENUE_IMAGES_BUCKET).getPublicUrl(primaryPhoto.storage_path).data.publicUrl
    : null;

  if (venueQuery.isLoading) {
    return (
      <div className="min-h-screen bg-surface p-4 space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (venueQuery.isError) {
    return <QueryErrorState onRetry={() => venueQuery.refetch()} />;
  }

  const venue = venueQuery.data;

  if (!venue) {
    return (
      <div className="min-h-screen bg-surface p-4">
        <EmptyState title={tc("no_results")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      <div className="mx-auto max-w-lg space-y-4 p-4">
        {/* Photo */}
        {primaryPhotoUrl && (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-secondary">
            <img
              src={primaryPhotoUrl}
              alt={venue.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-text-primary">{venue.name}</h1>
                <CityBadge city={venue.city} />
              </div>
              <SubscribeButton targetType="venue" targetId={venue.id} />
            </div>
          </CardContent>
        </Card>

        {/* Venue Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-text-secondary">{t("venue_info")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" />
              <div>
                <p className="text-sm text-text-secondary">{t("address")}</p>
                <p className="text-base text-text-primary">{venue.address}</p>
              </div>
            </div>

            {/* Hours */}
            {venue.hours && Object.keys(venue.hours).length > 0 && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" />
                  <div className="flex-1">
                    <p className="text-sm text-text-secondary">{t("hours")}</p>
                    <div className="space-y-1">
                      {Object.entries(venue.hours).map(([day, time]) => (
                        <div key={day} className="flex justify-between text-base">
                          <span className="text-text-secondary">{day}</span>
                          <span className="text-text-primary">{time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Capacity */}
            {venue.capacity != null && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" />
                  <div>
                    <p className="text-sm text-text-secondary">{t("capacity")}</p>
                    <p className="text-base text-text-primary">
                      {t("players_capacity", { count: venue.capacity })}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Contacts */}
            {venue.contacts && Object.keys(venue.contacts).length > 0 && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" />
                  <div className="flex-1">
                    <p className="text-sm text-text-secondary">{t("contacts")}</p>
                    <div className="space-y-1">
                      {Object.entries(venue.contacts).map(([label, value]) => (
                        <div key={label} className="flex justify-between text-base">
                          <span className="text-text-secondary">{label}</span>
                          <span className="text-text-primary">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Supported Formats */}
            {venue.supported_formats.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-sm text-text-secondary">{t("supported_formats")}</p>
                  <div className="flex flex-wrap gap-2">
                    {venue.supported_formats.map((format) => (
                      <FormatBadge key={format} format={format} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Analytics — owner only */}
        {user && venue.owner_id === user.id && venueId && (
          <VenueAnalytics venueId={venueId} />
        )}

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-text-secondary">
              <Calendar className="h-5 w-5" />
              {t("upcoming_events")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ) : eventsQuery.isError ? (
              <p className="py-4 text-center text-base text-red-400">
                {tc("error_occurred")}
              </p>
            ) : eventsQuery.data && eventsQuery.data.length > 0 ? (
              <div className="space-y-3">
                {eventsQuery.data.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-base text-text-secondary">
                {t("no_upcoming_events")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
