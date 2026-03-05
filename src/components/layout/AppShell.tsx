import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Plus, Settings, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/NotificationBell";

const NAV_ITEMS = [
  { to: "/", icon: Home, labelKey: "home" },
  { to: "/players", icon: Users, labelKey: "players" },
  { to: "/events/new", icon: Plus, labelKey: "create" },
  { to: "/profile", icon: User, labelKey: "profile" },
  { to: "/settings", icon: Settings, labelKey: "settings" },
] as const;

export function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();

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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-primary",
                location.pathname === to
                  ? "bg-primary text-accent"
                  : "text-gray-400"
              )}
            >
              <Icon className="h-5 w-5" />
              {t(labelKey)}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top header */}
        <header className="flex h-14 items-center justify-between border-b border-gray-700 bg-secondary px-4 md:px-6">
          <Link to="/" className="text-lg font-bold text-accent md:hidden">
            MTGX
          </Link>
          <div className="hidden md:block" />
          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-gray-700 bg-secondary md:hidden">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 text-xs",
              location.pathname === to ? "text-accent" : "text-gray-400"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{t(labelKey)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
