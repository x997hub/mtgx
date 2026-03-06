import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface WaitlistBadgeProps {
  position: number;
}

export function WaitlistBadge({ position }: WaitlistBadgeProps) {
  const { t } = useTranslation("events");

  return (
    <Badge className="bg-amber-700/20 text-amber-400 border-amber-600/30 gap-1.5">
      <Clock className="h-3.5 w-3.5" />
      {t("waitlist_position", { position })}
    </Badge>
  );
}
