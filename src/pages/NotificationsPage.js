import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
export default function NotificationsPage() {
    const { t } = useTranslation("common");
    const { notifications, isLoading, markAsRead, markAllRead } = useNotifications();
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    if (isLoading) {
        return (_jsxs("div", { className: "mx-auto max-w-lg space-y-3 p-4", children: [_jsx(Skeleton, { className: "h-8 w-48 rounded-lg" }), Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-20 w-full rounded-lg" }, i)))] }));
    }
    return (_jsxs("div", { className: "mx-auto max-w-lg space-y-4 p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold text-text-primary", children: t("notifications") }), unreadCount > 0 && (_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => markAllRead(), className: "gap-2 text-text-secondary hover:text-text-primary", children: [_jsx(CheckCheck, { className: "h-4 w-4" }), t("mark_all_read")] }))] }), notifications.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center gap-4 py-12 text-text-secondary", children: [_jsx(Bell, { className: "h-12 w-12 opacity-50" }), _jsx("p", { children: t("no_notifications") })] })) : (_jsx("div", { className: "space-y-2", children: notifications.map((notification) => (_jsx(Card, { className: cn("bg-surface-card border-surface-hover transition-colors", !notification.is_read && "border-l-2 border-l-accent"), children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1 space-y-1", children: [notification.event_id ? (_jsx(Link, { to: `/events/${notification.event_id}`, className: "font-medium text-text-primary hover:text-accent", onClick: () => {
                                                if (!notification.is_read) {
                                                    markAsRead(notification.id);
                                                }
                                            }, children: notification.title })) : (_jsx("p", { className: "font-medium text-text-primary", children: notification.title })), _jsx("p", { className: "text-sm text-text-secondary", children: notification.body }), _jsx("p", { className: "text-xs text-text-secondary", children: new Date(notification.created_at).toLocaleString() })] }), !notification.is_read && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => markAsRead(notification.id), className: "min-h-[44px] min-w-[44px] shrink-0", "aria-label": "Mark as read", children: _jsx(Check, { className: "h-4 w-4" }) }))] }) }) }, notification.id))) }))] }));
}
