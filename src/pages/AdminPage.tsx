import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, BarChart3, ShieldAlert, MessageSquare, Tags, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportTab } from "@/components/admin/ReportTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { EventsTab } from "@/components/admin/EventsTab";
import { FeedbackTab } from "@/components/admin/FeedbackTab";
import { MoodTagsTab } from "@/components/admin/MoodTagsTab";

interface NavItem {
  id: string;
  icon: LucideIcon;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "report", icon: BarChart3, labelKey: "report" },
  { id: "users", icon: Users, labelKey: "users" },
  { id: "events", icon: Calendar, labelKey: "events" },
  { id: "feedback", icon: MessageSquare, labelKey: "feedback" },
  { id: "mood-tags", icon: Tags, labelKey: "mood_tags" },
];

const PANELS: Record<string, React.FC> = {
  report: ReportTab,
  users: UsersTab,
  events: EventsTab,
  feedback: FeedbackTab,
  "mood-tags": MoodTagsTab,
};

export default function AdminPage() {
  const { t } = useTranslation(["common"]);
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("report");

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

  const ActivePanel = PANELS[activeTab];

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold text-text-primary mb-4">{t("common:admin")}</h1>

      <div className="flex gap-6">
        {/* Left sidebar nav */}
        <nav className="hidden md:flex flex-col gap-1 w-44 shrink-0">
          {NAV_ITEMS.map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-base font-medium transition-colors text-start",
                activeTab === id
                  ? "bg-accent/15 text-accent"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {t(`common:${labelKey}`, labelKey)}
            </button>
          ))}
        </nav>

        {/* Mobile horizontal scroll nav */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:hidden -mx-4 px-4">
          {NAV_ITEMS.map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors shrink-0",
                activeTab === id
                  ? "bg-accent text-white"
                  : "bg-surface-card text-text-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(`common:${labelKey}`, labelKey)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <ActivePanel />
        </div>
      </div>
    </div>
  );
}
