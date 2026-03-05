import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InviteStatus, MtgFormat } from "@/types/database.types";

interface InviteNotificationCardProps {
  invite: {
    id: number;
    status: InviteStatus;
    message: string | null;
    created_at: string;
    event_id: string | null;
    format: MtgFormat | null;
    from_profile?: { display_name: string; avatar_url: string | null } | null;
    events?: { id: string; title: string | null; format: MtgFormat; starts_at: string } | null;
  };
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
  isResponding: boolean;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function InviteNotificationCard({
  invite,
  onAccept,
  onDecline,
  isResponding,
}: InviteNotificationCardProps) {
  const { t } = useTranslation("profile");

  const senderName = invite.from_profile?.display_name ?? "Unknown";
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className={cn(
        "bg-surface-card border-surface-hover transition-colors",
        invite.status === "pending" && "border-l-2 border-l-accent"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            {invite.from_profile?.avatar_url ? (
              <img
                src={invite.from_profile.avatar_url}
                alt={senderName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <AvatarFallback>{initials}</AvatarFallback>
            )}
          </Avatar>

          <div className="flex-1 space-y-1">
            <p className="text-base font-medium text-text-primary">
              {t("invite_from", { name: senderName })}
            </p>

            {invite.events && (
              <Link
                to={`/events/${invite.events.id}`}
                className="text-sm text-accent hover:underline"
              >
                {invite.events.title || invite.events.format} —{" "}
                {new Date(invite.events.starts_at).toLocaleDateString()}
              </Link>
            )}

            {invite.format && !invite.events && (
              <FormatBadge format={invite.format} />
            )}

            {invite.message && (
              <p className="text-sm text-text-secondary italic">"{invite.message}"</p>
            )}

            <p className="text-xs text-text-secondary">
              <Clock className="mr-1 inline h-3 w-3" />
              {timeAgo(invite.created_at)}
            </p>
          </div>

          {invite.status === "pending" && (
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="min-h-[44px] min-w-[44px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                onClick={() => onAccept(invite.id)}
                disabled={isResponding}
              >
                <Check className="h-5 w-5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="min-h-[44px] min-w-[44px] text-red-400 hover:text-red-300 hover:bg-red-400/10"
                onClick={() => onDecline(invite.id)}
                disabled={isResponding}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          {invite.status !== "pending" && (
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded",
              invite.status === "accepted" && "text-emerald-400 bg-emerald-400/10",
              invite.status === "declined" && "text-red-400 bg-red-400/10",
              invite.status === "expired" && "text-gray-400 bg-gray-400/10"
            )}>
              {t(`invite_${invite.status}`)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
