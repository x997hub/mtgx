import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import type { Database } from "@/types/database.types";

type SubscriptionTarget = Database["public"]["Enums"]["subscription_target"];

interface SubscribeButtonProps {
  targetType: SubscriptionTarget;
  targetId?: string;
  className?: string;
}

export function SubscribeButton({ targetType, targetId, className }: SubscribeButtonProps) {
  const { t } = useTranslation();
  const { subscriptions, subscribe, unsubscribe, isSubscribing } = useSubscription();

  const existing = subscriptions.find(
    (s) => s.target_type === targetType && s.target_id === (targetId ?? null)
  );

  const handleClick = () => {
    if (existing) {
      unsubscribe(existing.id);
    } else {
      subscribe({ targetType, targetId });
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
