import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, BarChart3, ShieldAlert, MessageSquare, Tags } from "lucide-react";
import { ReportTab } from "@/components/admin/ReportTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { EventsTab } from "@/components/admin/EventsTab";
import { FeedbackTab } from "@/components/admin/FeedbackTab";
import { MoodTagsTab } from "@/components/admin/MoodTagsTab";

export default function AdminPage() {
  const { t } = useTranslation(["common"]);
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

        <TabsContent value="report"><ReportTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="events"><EventsTab /></TabsContent>
        <TabsContent value="feedback"><FeedbackTab /></TabsContent>
        <TabsContent value="mood-tags"><MoodTagsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
