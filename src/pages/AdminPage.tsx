import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { UserRole, EventStatus } from "@/types/database.types";
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
import { Users, Calendar, BarChart3, ShieldAlert } from "lucide-react";

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
            <p className="text-sm text-text-secondary">{t("common:admin_required")}</p>
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
            <BarChart3 className="mr-1 h-4 w-4" />
            {t("common:report", "Report")}
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-1 h-4 w-4" />
            {t("common:users", "Users")}
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="mr-1 h-4 w-4" />
            {t("common:events")}
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
      </Tabs>
    </div>
  );
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
        .single();
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

  const payload = report.payload as Record<string, number>;
  const metrics = Object.entries(payload);

  return (
    <div className="space-y-3 mt-4">
      <p className="text-xs text-text-secondary">
        Report date: {new Date(report.report_date).toLocaleDateString()}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([key, value]) => (
          <Card key={key} className="bg-surface-card border-surface-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-text-secondary">{key}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-accent">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function UsersTab() {
  const { t } = useTranslation(["common", "events"]);
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
      {profiles?.map((user) => (
        <Card key={user.id} className="bg-surface-card border-surface-hover">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-text-primary">{user.display_name}</p>
              <p className="text-sm text-text-secondary">{user.city}</p>
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
                    {role}
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
        .select("*")
        .order("starts_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
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
      {events?.map((evt) => {
        const title = evt.title || `Quick ${evt.format}`;
        const organizer = (evt as any).profiles?.display_name;

        return (
          <Card key={evt.id} className="bg-surface-card border-surface-hover">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FormatBadge format={evt.format} />
                <div>
                  <p className="font-medium text-text-primary">{title}</p>
                  <p className="text-sm text-text-secondary">
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
