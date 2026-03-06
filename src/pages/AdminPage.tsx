import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database, UserRole, EventStatus } from "@/types/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { toast } from "@/components/ui/use-toast";
import { Users, Calendar, BarChart3, ShieldAlert, MessageSquare, Tags } from "lucide-react";
import { FeedbackTab } from "@/components/admin/FeedbackTab";
import { MoodTagsTab } from "@/components/admin/MoodTagsTab";

const ROLES: UserRole[] = ["player", "organizer", "club_owner", "admin"];

const STATUS_COLORS: Record<EventStatus, string> = {
  active: "bg-emerald-700 text-emerald-100",
  confirmed: "bg-blue-700 text-blue-100",
  cancelled: "bg-red-700 text-red-100",
  expired: "bg-gray-700 text-gray-300",
};

export default function AdminPage() {
  const { t } = useTranslation(["common", "events"]);
  const { profile } = useAuth();

  if (profile?.role !== "admin") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="bg-surface-card border-surface-hover max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <ShieldAlert className="h-12 w-12 text-accent" />
            <p className="text-lg font-semibold text-text-primary">{t("common:access_denied")}</p>
            <p className="text-base text-text-secondary">{t("common:admin_required")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <h1 className="text-2xl font-bold text-text-primary">{t("common:admin")}</h1>

      <Tabs defaultValue="report">
        <TabsList className="bg-surface-card">
          <TabsTrigger value="report">
            <BarChart3 className="me-1 h-4 w-4" />
            {t("common:report", "Report")}
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="me-1 h-4 w-4" />
            {t("common:users", "Users")}
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="me-1 h-4 w-4" />
            {t("common:events")}
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <MessageSquare className="me-1 h-4 w-4" />
            {t("common:feedback", "Feedback")}
          </TabsTrigger>
          <TabsTrigger value="mood-tags">
            <Tags className="me-1 h-4 w-4" />
            {t("common:mood_tags", "Mood Tags")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="report">
          <ReportTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="events">
          <EventsTab />
        </TabsContent>
        <TabsContent value="feedback">
          <FeedbackTab />
        </TabsContent>
        <TabsContent value="mood-tags">
          <MoodTagsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

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

function ReportTab() {
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

  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-text-secondary">
        {t("common:report_date", { date: new Date(report.report_date).toLocaleDateString() })}
      </p>

      {/* Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label={t("common:new_users", "New users")} value={payload.new_users} />
        <MetricCard
          label={t("common:events_created", "Events created")}
          value={`${payload.events_created?.big ?? 0} big / ${payload.events_created?.quick ?? 0} quick`}
        />
        <MetricCard
          label={t("events:rsvp", "RSVPs")}
          value={`${payload.rsvps_today?.going ?? 0} / ${payload.rsvps_today?.maybe ?? 0} / ${payload.rsvps_today?.not_going ?? 0}`}
          subtitle={`${t("events:going")} / ${t("events:maybe")} / ${t("events:not_going")}`}
        />
        <MetricCard label={t("common:lfg_signals", "LFG signals")} value={payload.lfg_signals} />
        <MetricCard label={t("common:active_lfg", "Active LFG now")} value={payload.active_lfg_now} />
        {payload.cancellations && (
          <MetricCard
            label={t("common:cancellations", "Cancellations")}
            value={`${payload.cancellations.total} (${payload.cancellations.late_24h} late)`}
          />
        )}
      </div>

      {/* Low reliability users */}
      {payload.low_reliability_users && payload.low_reliability_users.length > 0 && (
        <Card className="bg-surface-card border-surface-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-400">
              {t("common:low_reliability", "Low reliability players")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payload.low_reliability_users.map((u) => (
                <div key={u.user_id} className="flex items-center justify-between text-base">
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

function MetricCard({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string }) {
  return (
    <Card className="bg-surface-card border-surface-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-text-secondary">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-accent">{value}</p>
        {subtitle && <p className="text-xs text-text-secondary mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

const ROLE_LABELS: Record<UserRole, string> = {
  player: "role_player",
  organizer: "role_organizer",
  club_owner: "role_club_owner",
  admin: "role_admin",
};

function UsersTab() {
  const { t } = useTranslation(["common", "events", "profile"]);
  const queryClient = useQueryClient();

  const { data: profiles, isLoading, isError } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: () => {
      toast({
        title: t("common:error_occurred"),
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="p-4 text-red-400">{t("common:error_occurred")}</p>;
  }

  return (
    <div className="space-y-2 mt-4">
      {profiles && profiles.length === 0 && (
        <p className="p-4 text-center text-text-secondary">{t("common:no_results")}</p>
      )}
      {profiles?.map((user) => (
        <Card key={user.id} className="bg-surface-card border-surface-hover">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-text-primary">{user.display_name}</p>
              <div className="flex items-center gap-2 text-base text-text-secondary">
                <span>{user.city}</span>
                {user.reliability_score != null && user.reliability_score < 1 && (
                  <Badge
                    className={`border-none text-xs ${
                      user.reliability_score < 0.5
                        ? "bg-red-700/20 text-red-400"
                        : "bg-amber-700/20 text-amber-400"
                    }`}
                  >
                    {t("profile:reliability_score", "Reliability")}: {(user.reliability_score * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
            </div>
            <Select
              value={user.role}
              onValueChange={(role) =>
                updateRoleMutation.mutate({ userId: user.id, role: role as UserRole })
              }
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {t(`profile:${ROLE_LABELS[role]}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EventsTab() {
  const { t } = useTranslation(["common", "events"]);
  const { data: events, isLoading, isError } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, profiles!events_organizer_id_fkey(display_name)" as "*")
        .order("starts_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as (Database["public"]["Tables"]["events"]["Row"] & {
        profiles?: { display_name: string } | null;
      })[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="p-4 text-red-400">{t("common:error_occurred")}</p>;
  }

  return (
    <div className="space-y-2 mt-4">
      {events && events.length === 0 && (
        <p className="p-4 text-center text-text-secondary">{t("common:no_results")}</p>
      )}
      {events?.map((evt) => {
        const title = evt.title || t("events:quick_format", { format: evt.format });
        const organizer = evt.profiles?.display_name;

        return (
          <Card key={evt.id} className="bg-surface-card border-surface-hover">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FormatBadge format={evt.format} />
                <div>
                  <p className="font-medium text-text-primary">{title}</p>
                  <p className="text-base text-text-secondary">
                    {new Date(evt.starts_at).toLocaleDateString()} — {evt.city}
                    {organizer && <> — {organizer}</>}
                  </p>
                </div>
              </div>
              <Badge
                className={`border-none ${STATUS_COLORS[evt.status as EventStatus] ?? "bg-gray-700 text-gray-300"}`}
              >
                {evt.status}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
