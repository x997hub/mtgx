import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Home, Plus, Settings, Shield, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useAuthStore } from "@/store/authStore";

const NAV_ITEMS = [
  { to: "/", icon: Home, labelKey: "home" },
  { to: "/players", icon: Users, labelKey: "players" },
  { to: "/clubs", icon: Building2, labelKey: "clubs" },
  { to: "/events/new", icon: Plus, labelKey: "create" },
  { to: "/profile", icon: User, labelKey: "profile" },
  { to: "/settings", icon: Settings, labelKey: "settings" },
] as const;

export function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const role = useAuthStore((s) => s.profile?.role);
  const isAdmin = role === "admin";

  return (
    <div className="flex min-h-screen bg-primary text-gray-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-gray-700 md:bg-secondary">
        <div className="flex h-16 items-center px-6">
          <Link to="/" className="text-xl font-bold text-accent">
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
                  : "text-gray-400"
              )}
            >
              <Icon className="h-6 w-6" />
              {t(labelKey)}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-lg font-medium transition-colors hover:bg-primary mt-auto",
                location.pathname === "/admin"
                  ? "bg-primary text-accent"
                  : "text-gray-400"
              )}
            >
              <Shield className="h-6 w-6" />
              {t("admin")}
            </Link>
          )}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-700 bg-secondary px-4 md:px-6">
          <Link to="/" className="text-lg font-bold text-accent md:hidden">
            MTGX
          </Link>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:text-accent transition-colors md:hidden"
              >
                <Shield className="h-5 w-5" />
              </Link>
            )}
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[72px] items-center justify-around border-t border-gray-700 bg-secondary md:hidden">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex min-h-[48px] min-w-[44px] flex-col items-center justify-center gap-0.5 text-xs",
              location.pathname === to ? "text-accent" : "text-gray-400"
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
