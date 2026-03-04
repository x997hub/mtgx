import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { FAB } from "@/components/shared/FAB";
import { useEvents } from "@/hooks/useEvents";
import { useFilterStore } from "@/store/filterStore";
import type { MtgFormat } from "@/types/database.types";

const FORMATS: MtgFormat[] = ["pauper", "commander", "standard", "draft"];
const CITIES = ["Tel Aviv", "Jerusalem", "Haifa", "Beer Sheva", "Netanya"];

export default function EventFeedPage() {
  const { t } = useTranslation(["events", "common"]);
  const navigate = useNavigate();
  const { format, city, setFormat, setCity } = useFilterStore();
  const { events, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useEvents();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !hasNextPage) return;
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      });
      observerRef.current.observe(node);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  return (
    <div className="space-y-4 pb-24">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
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

        {(format || city) && (
          <Badge
            variant="outline"
            className="cursor-pointer min-h-[44px] flex items-center border-surface-hover text-text-secondary hover:bg-surface-hover"
            onClick={() => {
              setFormat(null);
              setCity(null);
            }}
          >
            {t("events:browse_all")}
          </Badge>
        )}
      </div>

      {/* LFG Banner */}
      {/* TODO: integrate with LFG hook when available */}

      {/* Events grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("events:no_events")}
          description={t("events:no_events_description")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event as any} />
          ))}
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />
        </div>
      )}

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      )}

      {/* FAB for LFG */}
      <FAB onClick={() => navigate("/events/create")}>
        <CalendarPlus className="h-5 w-5 mr-2" />
        {t("common:create")}
      </FAB>
    </div>
  );
}
