import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import type { Database } from "@/types/database.types";

type SubscriptionTarget = Database["public"]["Enums"]["subscription_target"];
type MtgFormat = Database["public"]["Enums"]["mtg_format"];

interface SubscribeButtonProps {
  targetType: SubscriptionTarget;
  /** Required for organizer / venue targets */
  targetId?: string;
  /** Required for format_city target */
  format?: MtgFormat;
  /** Required for format_city target */
  city?: string;
  className?: string;
}

export function SubscribeButton({
  targetType,
  targetId,
  format,
  city,
  className,
}: SubscribeButtonProps) {
  const { t } = useTranslation();
  const { subscriptions, subscribe, unsubscribe, isSubscribing } = useSubscription();

  // Match subscription: for format_city we match on format+city; for others on target_id
  const existing = subscriptions.find((s) => {
    if (s.target_type !== targetType) return false;
    if (targetType === "format_city") {
      return s.format === (format ?? null) && s.city === (city ?? null);
    }
    return s.target_id === (targetId ?? null);
  });

  const handleClick = () => {
    if (existing) {
      unsubscribe(existing.id);
    } else {
      subscribe({ targetType, targetId, format, city });
    }
  };

  return (
    <Button
      variant={existing ? "secondary" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isSubscribing}
      className={className}
    >
      {existing ? (
        <>
          <BellOff className="mr-1 h-4 w-4" />
          {t("unsubscribe")}
        </>
      ) : (
        <>
          <Bell className="mr-1 h-4 w-4" />
          {t("subscribe")}
        </>
      )}
    </Button>
  );
}
