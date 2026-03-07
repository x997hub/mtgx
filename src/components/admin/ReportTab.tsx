import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  UserPlus, CalendarPlus, Hand, Radio, Antenna, XCircle,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: string;
}) {
  return (
    <Card className="bg-surface-card border-surface-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-text-secondary mb-1">{label}</p>
            <p className={`text-2xl font-bold ${accent ?? "text-accent"}`}>{value}</p>
            {subtitle && <p className="text-xs text-text-secondary mt-1">{subtitle}</p>}
          </div>
          <div className="rounded-lg bg-surface-hover p-2">
            <Icon className="h-5 w-5 text-text-secondary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
    return <p className="p-4 text-red-400">{t("common:error_occurred")}</p>;
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
        <MetricCard
          icon={UserPlus}
          label={t("common:new_users", "New users")}
          value={payload.new_users}
        />
        <MetricCard
          icon={CalendarPlus}
          label={t("common:events_created", "Events created")}
          value={(payload.events_created?.big ?? 0) + (payload.events_created?.quick ?? 0)}
          subtitle={`${payload.events_created?.big ?? 0} big / ${payload.events_created?.quick ?? 0} quick`}
        />
        <MetricCard
          icon={Hand}
          label={t("events:rsvp", "RSVPs")}
          value={totalRsvps}
          subtitle={`${payload.rsvps_today?.going ?? 0} ${t("events:going")} · ${payload.rsvps_today?.maybe ?? 0} ${t("events:maybe")} · ${payload.rsvps_today?.not_going ?? 0} ${t("events:not_going")}`}
        />
        <MetricCard
          icon={Radio}
          label={t("common:lfg_signals", "LFG signals")}
          value={payload.lfg_signals}
        />
        <MetricCard
          icon={Antenna}
          label={t("common:active_lfg", "Active LFG now")}
          value={payload.active_lfg_now}
          accent={payload.active_lfg_now > 0 ? "text-emerald-400" : undefined}
        />
        {payload.cancellations && (
          <MetricCard
            icon={XCircle}
            label={t("common:cancellations", "Cancellations")}
            value={payload.cancellations.total}
            subtitle={`${payload.cancellations.late_24h} ${t("common:late_cancellations", "late (<24h)")}`}
            accent={payload.cancellations.late_24h > 0 ? "text-red-400" : undefined}
          />
        )}
      </div>

      {/* Events below minimum */}
      {payload.events_below_minimum && payload.events_below_minimum.length > 0 && (
        <Card className="bg-surface-card border-amber-700/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-400">
              {t("common:events_below_min", "Events below minimum")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payload.events_below_minimum.map((e) => (
                <div key={e.event_id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary truncate">{e.title}</span>
                  <span className="text-amber-400 shrink-0 ms-2">
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
        <Card className="bg-surface-card border-red-700/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-400">
              {t("common:low_reliability", "Low reliability players")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payload.low_reliability_users.map((u) => (
                <div key={u.user_id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">{u.display_name}</span>
                  <Badge className="bg-red-700/20 text-red-400 border-none">
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
