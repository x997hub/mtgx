import { useTranslation } from "react-i18next";
import { useAdminStats } from "@/hooks/useAdminStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/StatCard";
import {
  AlertTriangle, UserPlus, CalendarPlus, Hand, Radio,
  TrendingUp, UserX, ChevronDown, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function DashboardPage() {
  const { t } = useTranslation(["common", "events"]);
  const { data: stats, isLoading, isError, dataUpdatedAt } = useAdminStats();
  const [trendsOpen, setTrendsOpen] = useState(false);
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="space-y-4 mt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError || !stats) {
    return <p className="p-4 text-danger">{t("common:error_occurred")}</p>;
  }

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const newUsersDelta = stats.this_week.new_users_prev_week > 0
    ? Math.round(((stats.this_week.new_users - stats.this_week.new_users_prev_week) / stats.this_week.new_users_prev_week) * 100)
    : 0;

  const hasAlerts = stats.today.inactive_organizers.length > 0 || stats.today.stale_lfg_count > 0;

  const activityRows = [
    { label: t("common:registrations"), key: "registrations" as const },
    { label: t("common:active_users_count"), key: "active_users" as const },
    { label: t("common:events_created"), key: "events_created" as const },
    { label: t("common:event_joins"), key: "event_joins" as const },
  ];

  return (
    <div className="space-y-4 mt-1">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {t("common:updated_at", { time: updatedAt })}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-stats"] })}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* ACTIVITY — Today & This Week */}
      {stats.activity && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("common:activity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-secondary border-b border-surface-hover">
                  <th className="text-left font-medium pb-2" />
                  <th className="text-right font-medium pb-2 w-24">{t("common:today")}</th>
                  <th className="text-right font-medium pb-2 w-24">{t("common:this_week")}</th>
                </tr>
              </thead>
              <tbody>
                {activityRows.map(({ label, key }) => (
                  <tr key={key} className="border-b border-surface-hover last:border-0">
                    <td className="py-2.5 text-text-secondary">{label}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-text-primary">
                      {stats.activity.today[key]}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-text-primary">
                      {stats.activity.week[key]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ZONE 1: TODAY — Alerts */}
      <Card className={hasAlerts ? "border-warning/40" : "border-success/40"}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${hasAlerts ? "text-warning" : "text-success"}`} />
            {t("common:today")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAlerts ? (
            <p className="text-sm text-success">{t("common:all_good", "All good — nothing needs attention")}</p>
          ) : (
            <div className="space-y-2">
              {stats.today.inactive_organizers.map((org) => (
                <div key={org.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">
                    {org.display_name} — {t("common:inactive_organizer", "inactive 14d+")}
                  </span>
                </div>
              ))}
              {stats.today.stale_lfg_count > 0 && (
                <div className="text-sm text-text-primary">
                  {t("common:stale_lfg", { count: stats.today.stale_lfg_count })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ZONE 2: THIS WEEK — Core Metrics */}
      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-3">{t("common:this_week", "This week")}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={UserPlus}
            title={t("common:new_users", "New users")}
            value={stats.this_week.new_users}
            trend={newUsersDelta !== 0 ? { value: Math.abs(newUsersDelta), positive: newUsersDelta > 0 } : undefined}
            subtitle={`${t("common:total")}: ${stats.this_week.total_users}`}
          />
          <StatCard
            icon={TrendingUp}
            title={t("common:activation_rate", "Activation rate")}
            value={`${stats.this_week.activation_rate}%`}
            subtitle={t("common:activation_desc", "First RSVP within 7 days")}
          />
          <StatCard
            icon={CalendarPlus}
            title={t("common:events_created", "Events")}
            value={stats.this_week.events_created}
          />
          <StatCard
            icon={Hand}
            title={t("events:rsvp", "RSVPs")}
            value={stats.this_week.rsvps}
          />
          <StatCard
            icon={Radio}
            title={t("common:lfg_conversion", "LFG conversion")}
            value={`${stats.this_week.lfg_conversion_rate}%`}
            subtitle={t("common:lfg_conversion_desc", "LFG → RSVP within 72h")}
          />
          <StatCard
            icon={UserX}
            title={t("common:silent_exits", "Silent exits")}
            value={stats.this_week.silent_exit_count}
            subtitle={t("common:silent_exits_desc", "No activity 30d+")}
            trend={stats.this_week.silent_exit_count > 5 ? { value: stats.this_week.silent_exit_count, positive: false } : undefined}
          />
        </div>
      </div>

      {/* ZONE 3: TRENDS — Collapsed */}
      <Card>
        <button
          className="w-full px-6 py-4 flex items-center justify-between text-text-secondary hover:text-text-primary transition-colors"
          onClick={() => setTrendsOpen(!trendsOpen)}
        >
          <span className="text-sm font-medium">{t("common:trends_30d", "Trends (30 days)")}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${trendsOpen ? "rotate-180" : ""}`} />
        </button>
        {trendsOpen && (
          <CardContent className="pt-0">
            {stats.trends.length === 0 ? (
              <p className="text-sm text-text-secondary py-4">
                {t("common:trends_no_data", "No trend data yet. Stats are collected daily.")}
              </p>
            ) : (
              <div className="space-y-2">
                {/* Group trends by metric_key */}
                {Object.entries(
                  stats.trends.reduce((acc, item) => {
                    if (!acc[item.metric_key]) acc[item.metric_key] = [];
                    acc[item.metric_key].push(item);
                    return acc;
                  }, {} as Record<string, typeof stats.trends>)
                ).map(([key, values]) => (
                  <div key={key} className="flex items-center justify-between text-sm py-1 border-b border-surface-hover last:border-0">
                    <span className="text-text-secondary capitalize">{key.replace(/_/g, " ")}</span>
                    <div className="flex gap-1 font-mono text-xs text-text-muted">
                      {values.slice(-7).map((v, i) => (
                        <span key={i} className="w-8 text-center">{v.value}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
