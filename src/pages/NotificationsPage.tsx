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
    return (
      <div className="mx-auto max-w-lg space-y-3 p-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">{t("notifications")}</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead()}
            className="gap-2 text-text-secondary hover:text-text-primary"
          >
            <CheckCheck className="h-4 w-4" />
            {t("mark_all_read")}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-text-secondary">
          <Bell className="h-12 w-12 opacity-50" />
          <p>{t("no_notifications")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                "bg-surface-card border-surface-hover transition-colors",
                !notification.is_read && "border-l-2 border-l-accent"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    {notification.event_id ? (
                      <Link
                        to={`/events/${notification.event_id}`}
                        className="font-medium text-text-primary hover:text-accent"
                        onClick={() => {
                          if (!notification.is_read) {
                            markAsRead(notification.id);
                          }
                        }}
                      >
                        {notification.title}
                      </Link>
                    ) : (
                      <p className="font-medium text-text-primary">{notification.title}</p>
                    )}
                    <p className="text-sm text-text-secondary">{notification.body}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="min-h-[44px] min-w-[44px] shrink-0"
                      aria-label="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
