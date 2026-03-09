import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerCard } from "@/components/players/PlayerCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePlayers, useVenuesList } from "@/hooks/usePlayers";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useAuthStore } from "@/store/authStore";
import { FORMATS, CITIES, DAYS } from "@/lib/constants";
import type { MtgFormat, DayOfWeek } from "@/types/database.types";

export default function PlayersDirectoryPage() {
  const { t } = useTranslation(["profile", "common", "events"]);
  const currentUserRole = useAuthStore((s) => s.profile?.role);
  const showReliability = currentUserRole === "organizer" || currentUserRole === "club_owner" || currentUserRole === "admin";

  const [format, setFormat] = useState<MtgFormat | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [day, setDay] = useState<DayOfWeek | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);

  const { players, availabilityMap, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usePlayers({ format, city, day, venueId });

  const { data: venues } = useVenuesList();

  const hasFilters = format || city || day || venueId;

  const resetFilters = () => {
    setFormat(null);
    setCity(null);
    setDay(null);
    setVenueId(null);
  };

  const sentinelRef = useInfiniteScroll(fetchNextPage, hasNextPage, isFetchingNextPage);

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* Title */}
      <h1 className="text-2xl font-bold text-text-primary">
        {t("profile:players_directory")}
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Format filter */}
        <Select
          value={format ?? "all"}
          onValueChange={(v) => setFormat(v === "all" ? null : (v as MtgFormat))}
        >
          <SelectTrigger className="w-[140px] min-h-[44px]">
            <SelectValue placeholder={t("events:all_formats")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("events:all_formats")}</SelectItem>
            {FORMATS.map((f) => (
              <SelectItem key={f} value={f}>
                {t(`events:${f}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* City filter */}
        <Select
          value={city ?? "all"}
          onValueChange={(v) => setCity(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[140px] min-h-[44px]">
            <SelectValue placeholder={t("events:all_cities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("events:all_cities")}</SelectItem>
            {CITIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Day filter */}
        <Select
          value={day ?? "all"}
          onValueChange={(v) => setDay(v === "all" ? null : (v as DayOfWeek))}
        >
          <SelectTrigger className="w-[120px] min-h-[44px]">
            <SelectValue placeholder={t("profile:all_days")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("profile:all_days")}</SelectItem>
            {DAYS.map((d) => (
              <SelectItem key={d} value={d}>
                {t(`profile:${d}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Venue filter */}
        {venues && venues.length > 0 && (
          <Select
            value={venueId ?? "all"}
            onValueChange={(v) => setVenueId(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[160px] min-h-[44px]">
              <SelectValue placeholder={t("profile:all_venues")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("profile:all_venues")}</SelectItem>
              {venues.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Reset filters */}
        {hasFilters && (
          <Badge
            variant="outline"
            className="cursor-pointer min-h-[44px] flex items-center border-surface-hover text-text-secondary hover:bg-surface-hover"
            onClick={resetFilters}
          >
            {t("profile:clear_filters")}
          </Badge>
        )}
      </div>

      {/* Players grid */}
      {isError ? (
        <p className="text-center text-red-400">{t("common:error_occurred")}</p>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("profile:no_players")}
          description={t("profile:no_players_description")}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              availability={availabilityMap.get(player.id) ?? []}
              showReliability={showReliability}
            />
          ))}
          <div ref={sentinelRef} className="h-1" />
        </div>
      )}

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      )}
    </div>
  );
}
