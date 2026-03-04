import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Plus, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/NotificationBell";
const NAV_ITEMS = [
    { to: "/", icon: Home, labelKey: "home" },
    { to: "/events/new", icon: Plus, labelKey: "create" },
    { to: "/profile", icon: User, labelKey: "profile" },
    { to: "/settings", icon: Settings, labelKey: "settings" },
];
export function AppShell() {
    const { t } = useTranslation();
    const location = useLocation();
    return (_jsxs("div", { className: "flex min-h-screen bg-[#1a1a2e] text-gray-100", children: [_jsxs("aside", { className: "hidden md:flex md:w-64 md:flex-col md:border-r md:border-gray-700 md:bg-[#16213e]", children: [_jsx("div", { className: "flex h-16 items-center px-6", children: _jsx(Link, { to: "/", className: "text-xl font-bold text-[#e94560]", children: "MTGX" }) }), _jsx("nav", { className: "flex flex-1 flex-col gap-1 px-3", children: NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (_jsxs(Link, { to: to, className: cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[#1a1a2e]", location.pathname === to
                                ? "bg-[#1a1a2e] text-[#e94560]"
                                : "text-gray-400"), children: [_jsx(Icon, { className: "h-5 w-5" }), t(labelKey)] }, to))) })] }), _jsxs("div", { className: "flex flex-1 flex-col", children: [_jsxs("header", { className: "flex h-14 items-center justify-between border-b border-gray-700 bg-[#16213e] px-4 md:px-6", children: [_jsx(Link, { to: "/", className: "text-lg font-bold text-[#e94560] md:hidden", children: "MTGX" }), _jsx("div", { className: "hidden md:block" }), _jsx(NotificationBell, {})] }), _jsx("main", { className: "flex-1 overflow-y-auto pb-20 md:pb-6", children: _jsx(Outlet, {}) })] }), _jsx("nav", { className: "fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-gray-700 bg-[#16213e] md:hidden", children: NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (_jsxs(Link, { to: to, className: cn("flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 text-xs", location.pathname === to ? "text-[#e94560]" : "text-gray-400"), children: [_jsx(Icon, { className: "h-5 w-5" }), _jsx("span", { children: t(labelKey) })] }, to))) })] }));
}
