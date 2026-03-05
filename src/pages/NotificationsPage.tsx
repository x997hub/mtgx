import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bell, Check, CheckCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { useInvites } from "@/hooks/useInvites";
import { InviteNotificationCard } from "@/components/shared/InviteNotificationCard";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { t } = useTranslation("common");
  const { t: tp } = useTranslation("profile");
  const { notifications, isLoading, markAsRead, markAllRead } = useNotifications();
  const { incoming, pendingCount, respondInvite, isResponding } = useInvites();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"notifications" | "invites">("notifications");

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleAccept(id: number) {
    try {
      await respondInvite({ invite_id: id, status: "accepted" });
      toast({ title: t("invite_accepted", "Invitation accepted") });
    } catch {
      toast({ title: t("error_occurred"), variant: "destructive" });
    }
  }

  async function handleDecline(id: number) {
    try {
      await respondInvite({ invite_id: id, status: "declined" });
    } catch {
      toast({ title: t("error_occurred"), variant: "destructive" });
    }
  }

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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={cn(
            "px-4 py-2 rounded-t text-base font-medium transition-colors",
            activeTab === "notifications"
              ? "text-accent border-b-2 border-accent"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          {t("notifications_tab", "Notifications")}
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-xs text-white px-1">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("invites")}
          className={cn(
            "px-4 py-2 rounded-t text-base font-medium transition-colors",
            activeTab === "invites"
              ? "text-accent border-b-2 border-accent"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          {t("invites_tab", "Invites")}
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-xs text-white px-1">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "notifications" && (
        notifications.length === 0 ? (
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
                      <p className="text-base text-text-secondary">{notification.body}</p>
                      <p className="text-sm text-text-secondary">
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
        )
      )}

      {activeTab === "invites" && (
        incoming.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-text-secondary">
            <Mail className="h-12 w-12 opacity-50" />
            <p>{tp("no_recommended_players", "No invites yet")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {incoming.map((invite) => (
              <InviteNotificationCard
                key={invite.id}
                invite={{
                  id: invite.id,
                  status: invite.status,
                  message: invite.message,
                  created_at: invite.created_at,
                  event_id: invite.event_id,
                  format: invite.format,
                  from_profile: invite.from_profile,
                  events: invite.events,
                }}
                onAccept={handleAccept}
                onDecline={handleDecline}
                isResponding={isResponding}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
