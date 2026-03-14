import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3, Users, Calendar, MessageSquare, Tags, ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  path: string;
  icon: LucideIcon;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", path: "/admin/dashboard", icon: BarChart3, labelKey: "dashboard" },
  { id: "users", path: "/admin/users", icon: Users, labelKey: "users" },
  { id: "events", path: "/admin/events", icon: Calendar, labelKey: "events" },
  { id: "feedback", path: "/admin/feedback", icon: MessageSquare, labelKey: "feedback" },
  { id: "mood-tags", path: "/admin/mood-tags", icon: Tags, labelKey: "mood_tags" },
];

export default function AdminLayout() {
  const { t } = useTranslation(["common"]);
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  const activeTab = NAV_ITEMS.find(item => location.pathname === item.path)?.id || "dashboard";

  return (
    <div className="w-full px-3 py-2 sm:px-4 sm:py-3 lg:px-6">
      <h1 className="text-xl font-bold text-text-primary mb-2 sm:text-2xl sm:mb-3 md:hidden">{t("common:admin")}</h1>

      {/* Mobile horizontal scroll nav (desktop uses AppShell sidebar) */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 md:hidden -mx-3 px-3 scrollbar-none">
        {NAV_ITEMS.map(({ id, path, icon: Icon, labelKey }) => (
          <button
            key={id}
            onClick={() => navigate(path)}
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

      {/* Content — full width */}
      <div className="min-w-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
