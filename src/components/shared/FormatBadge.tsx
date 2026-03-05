import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type MtgFormat = Database["public"]["Enums"]["mtg_format"];

const FORMAT_COLORS: Record<MtgFormat, string> = {
  pauper: "bg-emerald-700 text-emerald-100",
  commander: "bg-purple-700 text-purple-100",
  standard: "bg-blue-700 text-blue-100",
  draft: "bg-amber-700 text-amber-100",
};

interface FormatBadgeProps {
  format: MtgFormat;
  className?: string;
}

export function FormatBadge({ format, className }: FormatBadgeProps) {
  const { t } = useTranslation("events");

  return (
    <Badge className={cn("border-none", FORMAT_COLORS[format] ?? "bg-gray-700 text-gray-100", className)}>
      {t(format)}
    </Badge>
  );
}
