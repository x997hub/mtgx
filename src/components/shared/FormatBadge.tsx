import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { FORMAT_BADGE_COLORS } from "@/lib/constants";
import type { Database } from "@/types/database.types";

type MtgFormat = Database["public"]["Enums"]["mtg_format"];

interface FormatBadgeProps {
  format: MtgFormat;
  className?: string;
}

export function FormatBadge({ format, className }: FormatBadgeProps) {
  const { t } = useTranslation("events");

  return (
    <Badge className={cn("border-none", FORMAT_BADGE_COLORS[format] ?? "bg-border text-text-primary", className)}>
      {t(format)}
    </Badge>
  );
}
