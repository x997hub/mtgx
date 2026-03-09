import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  UserPlus, CalendarPlus, Hand, Radio, Antenna, XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/StatCard";

interface DailyReportPayload {
  date: string;
  new_users: number;
  events_created: { big: number; quick: number };
  rsvps_today: { going: number; maybe: number; not_going: number };
  lfg_signals: number;
  active_lfg_now: number;
  low_reliability_users: { user_id: string; display_name: string; score: number }[];
  events_below_minimum?: { event_id: string; title: string; starts_at: string; rsvp_count: number; min: number }[];
  cancellations?: { total: number; late_24h: number };
}

export function ReportTab() {
  const { t } = useTranslation(["common", "events"]);
  const { data: report, isLoading, isError } = useQuery({
    queryKey: ["admin-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="p-4 text-danger">{t("common:error_occurred")}</p>;
  }

  if (!report) {
    return <p className="p-4 text-text-secondary">{t("common:no_reports")}</p>;
  }

  const payload = report.payload as unknown as DailyReportPayload;
  const totalRsvps =
    (payload.rsvps_today?.going ?? 0) +
    (payload.rsvps_today?.maybe ?? 0) +
    (payload.rsvps_today?.not_going ?? 0);

  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-text-secondary">
        {t("common:report_date", { date: new Date(report.report_date).toLocaleDateString() })}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={UserPlus}
          title={t("common:new_users", "New users")}
          value={payload.new_users}
        />
        <StatCard
          icon={CalendarPlus}
          title={t("common:events_created", "Events created")}
          value={(payload.events_created?.big ?? 0) + (payload.events_created?.quick ?? 0)}
          subtitle={`${payload.events_created?.big ?? 0} big / ${payload.events_created?.quick ?? 0} quick`}
        />
        <StatCard
          icon={Hand}
          title={t("events:rsvp", "RSVPs")}
          value={totalRsvps}
          subtitle={`${payload.rsvps_today?.going ?? 0} ${t("events:going")} · ${payload.rsvps_today?.maybe ?? 0} ${t("events:maybe")} · ${payload.rsvps_today?.not_going ?? 0} ${t("events:not_going")}`}
        />
        <StatCard
          icon={Radio}
          title={t("common:lfg_signals", "LFG signals")}
          value={payload.lfg_signals}
        />
        <StatCard
          icon={Antenna}
          title={t("common:active_lfg", "Active LFG now")}
          value={payload.active_lfg_now}
          trend={payload.active_lfg_now > 0 ? { value: payload.active_lfg_now, positive: true } : undefined}
        />
        {payload.cancellations && (
          <StatCard
            icon={XCircle}
            title={t("common:cancellations", "Cancellations")}
            value={payload.cancellations.total}
            subtitle={`${payload.cancellations.late_24h} ${t("common:late_cancellations", "late (<24h)")}`}
            trend={payload.cancellations.late_24h > 0 ? { value: payload.cancellations.late_24h, positive: false } : undefined}
          />
        )}
      </div>

      {/* Events below minimum */}
      {payload.events_below_minimum && payload.events_below_minimum.length > 0 && (
        <Card className="bg-surface-card border-warning/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-warning">
              {t("common:events_below_min", "Events below minimum")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payload.events_below_minimum.map((e) => (
                <div key={e.event_id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary truncate">{e.title}</span>
                  <span className="text-warning shrink-0 ms-2">
                    {e.rsvp_count}/{e.min}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low reliability users */}
      {payload.low_reliability_users && payload.low_reliability_users.length > 0 && (
        <Card className="bg-surface-card border-danger/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-danger">
              {t("common:low_reliability", "Low reliability players")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payload.low_reliability_users.map((u) => (
                <div key={u.user_id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">{u.display_name}</span>
                  <Badge variant="danger" className="border-none">
                    {(u.score * 100).toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
