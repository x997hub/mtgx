import { useTranslation } from "react-i18next";
import { Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RecurringBadgeProps {
  className?: string;
}

export function RecurringBadge({ className }: RecurringBadgeProps) {
  const { t } = useTranslation("events");

  return (
    <Badge
      className={cn(
        "gap-1 text-xs px-2 py-0.5 bg-indigo-700/30 text-indigo-300 border-indigo-700/50",
        className
      )}
    >
      <Repeat className="h-3 w-3" />
      {t("recurring", "Recurring")}
    </Badge>
  );
}
