import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Calendar, XCircle, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/StatCard";
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
      const { data, error } = await supabase
        .from("organizer_stats")
        .select("*")
        .eq("organizer_id", organizerId)
        .maybeSingle();
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
    <div className="grid grid-cols-3 gap-3">
      <StatCard
        title={t("events_organized", "Events")}
        value={stats.events_total ?? 0}
        icon={Calendar}
      />
      <StatCard
        title={t("cancel_rate", "Cancel %")}
        value={`${stats.cancel_rate ?? 0}%`}
        icon={XCircle}
        trend={(stats.cancel_rate ?? 0) > 10 ? { value: stats.cancel_rate ?? 0, positive: false } : undefined}
      />
      <StatCard
        title={t("avg_attendance", "Avg attend.")}
        value={Math.round(stats.avg_attendance ?? 0)}
        icon={Users}
      />
    </div>
  );
}
