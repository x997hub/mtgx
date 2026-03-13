import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart3, Building2, Calendar, Home, MessageSquare,
  Plus, Settings, Shield, Tags, User, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { FeedbackModal } from "@/components/shared/FeedbackModal";
import { useAuthStore } from "@/store/authStore";

const NAV_ITEMS = [
  { to: "/", icon: Home, labelKey: "home" },
  { to: "/players", icon: Users, labelKey: "players" },
  { to: "/clubs", icon: Building2, labelKey: "clubs" },
  { to: "/events/new", icon: Plus, labelKey: "create" },
  { to: "/profile", icon: User, labelKey: "profile" },
  { to: "/settings", icon: Settings, labelKey: "settings" },
] as const;

const ADMIN_SUB_ITEMS = [
  { to: "/admin/dashboard", icon: BarChart3, labelKey: "dashboard" },
  { to: "/admin/users", icon: Users, labelKey: "users" },
  { to: "/admin/events", icon: Calendar, labelKey: "events" },
  { to: "/admin/feedback", icon: MessageSquare, labelKey: "feedback" },
  { to: "/admin/mood-tags", icon: Tags, labelKey: "mood_tags" },
] as const;

export function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const role = useAuthStore((s) => s.profile?.role);
  const isAdmin = role === "admin";
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="flex min-h-screen flex-col bg-primary text-text-primary">
      <OfflineBanner />
      <div className="flex flex-1">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-48 md:flex-col md:border-e md:border-border md:bg-secondary">
        <div className="flex h-16 items-center px-6">
          <Link to="/" className="font-heading text-xl font-bold text-accent">
            MTGX
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-lg font-medium transition-colors hover:bg-primary",
                location.pathname === to
                  ? "bg-primary text-accent"
                  : "text-text-secondary"
              )}
            >
              <Icon className="h-6 w-6" />
              {t(labelKey)}
            </Link>
          ))}
          {isAdmin && (
            <>
              <Link
                to="/admin/dashboard"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-lg font-medium transition-colors hover:bg-primary mt-auto",
                  isAdminRoute
                    ? "bg-primary text-accent"
                    : "text-text-secondary"
                )}
              >
                <Shield className="h-6 w-6" />
                {t("admin")}
              </Link>
              {isAdminRoute && (
                <div className="flex flex-col gap-0.5 ps-4 pb-2">
                  {ADMIN_SUB_ITEMS.map(({ to, icon: Icon, labelKey }) => (
                    <Link
                      key={to}
                      to={to}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary",
                        location.pathname === to
                          ? "text-accent bg-primary"
                          : "text-text-secondary"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {t(labelKey)}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-secondary px-4 md:px-6">
          <Link to="/" className="font-heading text-lg font-bold text-accent md:hidden">
            MTGX
          </Link>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:text-accent transition-colors md:hidden"
              >
                <Shield className="h-5 w-5" />
              </Link>
            )}
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Feedback button (Feature #36) */}
      <FeedbackModal />
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 start-0 end-0 z-40 flex h-[72px] items-center justify-around border-t border-border bg-secondary md:hidden">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex min-h-[48px] min-w-[44px] flex-col items-center justify-center gap-0.5 text-xs",
              location.pathname === to ? "text-accent" : "text-text-secondary"
            )}
          >
            <Icon className="h-6 w-6" />
            <span>{t(labelKey)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
