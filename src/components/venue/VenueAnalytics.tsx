import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Users, Calendar, TrendingUp } from "lucide-react";
import { FormatBadge } from "@/components/shared/FormatBadge";
import type { MtgFormat } from "@/types/database.types";

interface VenueAnalyticsProps {
  venueId: string;
}

interface AnalyticsData {
  unique_players: number;
  popular_formats: { format: MtgFormat; count: number }[] | null;
  peak_days: { day_of_week: number; count: number }[] | null;
  show_rate: number | null;
  retention: number | null;
}

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function VenueAnalytics({ venueId }: VenueAnalyticsProps) {
  const { t } = useTranslation(["venue", "common"]);

  const analyticsQuery = useQuery<AnalyticsData>({
    queryKey: ["venue-analytics", venueId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_venue_analytics", {
        p_venue_id: venueId,
      });
      if (error) throw error;
      return data as unknown as AnalyticsData;
    },
  });

  if (analyticsQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (analyticsQuery.isError) {
    return null;
  }

  const data = analyticsQuery.data;
  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-text-secondary">
          <BarChart3 className="h-5 w-5" />
          {t("venue:analytics")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unique Players */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Users className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">
              {t("venue:unique_players")}
            </p>
            <p className="text-xl font-bold text-text-primary">
              {data.unique_players}
            </p>
          </div>
        </div>

        {/* Popular Formats */}
        {data.popular_formats && data.popular_formats.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-text-secondary">
              {t("venue:popular_formats")}
            </p>
            <div className="flex flex-wrap gap-2">
              {data.popular_formats.map((f) => (
                <div key={f.format} className="flex items-center gap-1">
                  <FormatBadge format={f.format} />
                  <span className="text-sm text-text-secondary">
                    ({f.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Peak Days */}
        {data.peak_days && data.peak_days.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-text-secondary">
              {t("venue:peak_days")}
            </p>
            <div className="flex flex-wrap gap-2">
              {data.peak_days.map((d) => (
                <div
                  key={d.day_of_week}
                  className="flex items-center gap-1 rounded-full bg-surface-card border border-border px-3 py-1"
                >
                  <Calendar className="h-3.5 w-3.5 text-text-secondary" />
                  <span className="text-sm text-text-primary">
                    {t(`venue:day_${DAY_KEYS[d.day_of_week]}`)}
                  </span>
                  <span className="text-xs text-text-secondary">
                    ({d.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show Rate & Retention — placeholder until QR check-in */}
        <div className="rounded-lg border border-border bg-surface-card p-3">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <TrendingUp className="h-4 w-4" />
            <span>
              {t("venue:show_rate")} & {t("venue:retention")}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {t("venue:qr_required_placeholder")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
