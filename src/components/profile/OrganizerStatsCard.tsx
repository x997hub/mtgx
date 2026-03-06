import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

interface OrganizerStats {
  organizer_id: string;
  events_total: number;
  events_cancelled: number;
  cancel_rate: number;
  avg_attendance: number;
}

interface OrganizerStatsCardProps {
  organizerId: string;
}

export function OrganizerStatsCard({ organizerId }: OrganizerStatsCardProps) {
  const { t } = useTranslation("profile");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["organizer-stats", organizerId],
    queryFn: async () => {
      // organizer_stats view may not yet be in database.types.ts
      const { data, error } = await (supabase
        .from("organizer_stats" as "profiles")
        .select("*")
        .eq("organizer_id" as "id", organizerId)
        .maybeSingle() as unknown as Promise<{
          data: OrganizerStats | null;
          error: { message: string } | null;
        }>);
      if (error) throw error;
      return data;
    },
    enabled: !!organizerId,
  });

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  if (!stats || stats.events_total === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-gray-400">
          <BarChart3 className="h-4 w-4" />
          {t("organizer_stats", "Organizer stats")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-base text-gray-200">
          {t("organizer_stats_summary", {
            events: stats.events_total,
            cancelRate: stats.cancel_rate ?? 0,
            avgAttendance: Math.round(stats.avg_attendance ?? 0),
            defaultValue: `${stats.events_total} events • ${stats.cancel_rate ?? 0}% cancellations • ~${Math.round(stats.avg_attendance ?? 0)} avg attendance`,
          })}
        </p>
      </CardContent>
    </Card>
  );
}
