import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, Flame, Search } from "lucide-react";
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
import { LFGBanner } from "@/components/events/LFGBanner";
import { LFGToggleButton } from "@/components/events/LFGToggleButton";
import { LFGSignalList } from "@/components/events/LFGSignalList";
import { EmptyState } from "@/components/shared/EmptyState";
import { FAB } from "@/components/shared/FAB";
import { useEvents } from "@/hooks/useEvents";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { FORMATS, CITIES } from "@/lib/constants";
import { isToday } from "@/lib/utils";
import type { MtgFormat } from "@/types/database.types";
import type { EventWithRelations } from "@/hooks/useEvents";

export default function EventFeedPage() {
  const { t } = useTranslation(["events", "common"]);
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const { format, city, setFormat, setCity } = useFilterStore();
  const { events, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useEvents();

  const sentinelRef = useInfiniteScroll(fetchNextPage, hasNextPage, isFetchingNextPage);

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

      {/* LFG Banner + Toggle + Signals */}
      <LFGBanner />
      <div className="flex items-center gap-2">
        <LFGToggleButton />
      </div>
      <LFGSignalList city={profile?.city ?? undefined} />

      {/* Events */}
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
        <EventSections events={events} sentinelRef={sentinelRef} />
      )}

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      )}

      {/* FAB for LFG */}
      <FAB onClick={() => navigate("/events/new")}>
        <CalendarPlus className="h-5 w-5 mr-2" />
        {t("common:create")}
      </FAB>
    </div>
  );
}

function EventSections({
  events,
  sentinelRef,
}: {
  events: EventWithRelations[];
  sentinelRef: (node: HTMLDivElement | null) => void;
}) {
  const { t } = useTranslation("events");

  const { todayEvents, upcomingEvents } = useMemo(() => {
    const today: EventWithRelations[] = [];
    const upcoming: EventWithRelations[] = [];
    for (const e of events) {
      if (isToday(e.starts_at)) {
        today.push(e);
      } else {
        upcoming.push(e);
      }
    }
    return { todayEvents: today, upcomingEvents: upcoming };
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Today's events — highlighted block */}
      {todayEvents.length > 0 && (
        <section className="rounded-xl border-2 border-accent/40 bg-accent/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
            </span>
            <Flame className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-bold text-accent">
              {t("today")}
            </h2>
            <Badge className="bg-accent/20 text-accent border-none">
              {todayEvents.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <section className="space-y-3">
          {todayEvents.length > 0 && (
            <h2 className="text-lg font-semibold text-text-secondary">
              {t("upcoming")}
            </h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
            <div ref={sentinelRef} className="h-1" />
          </div>
        </section>
      )}

      {/* Sentinel when there are only today events */}
      {upcomingEvents.length === 0 && (
        <div ref={sentinelRef} className="h-1" />
      )}
    </div>
  );
}
