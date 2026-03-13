import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { useLFG } from "@/hooks/useLFG";
import type { MtgFormat } from "@/types/database.types";

interface LFGSignalListProps {
  city?: string;
}

export function LFGSignalList({ city }: LFGSignalListProps) {
  const { t } = useTranslation(["events", "common"]);
  const { signals, isSignalsLoading } = useLFG(city);

  if (isSignalsLoading || signals.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-base font-medium text-accent">
        <Zap className="h-5 w-5" />
        {t("lfg_banner", { count: signals.length })}
      </div>
      <ul className="space-y-1">
        {signals.map((signal) => {
          const remainingMs = Math.max(0, new Date(signal.expires_at).getTime() - Date.now());
          const remainingH = Math.floor(remainingMs / 3600000);
          const remainingM = Math.floor((remainingMs % 3600000) / 60000);
          const remainingText = remainingMs <= 0
            ? t("events:signal_expired")
            : remainingH > 0
              ? `${remainingH}${t("events:hours_short")} ${remainingM}${t("events:minutes_short")}`
              : `${remainingM}${t("events:minutes_short")}`;

          return (
            <li
              key={signal.id}
              className="flex items-center gap-3 rounded-lg bg-accent/5 border border-accent/20 px-3 py-2"
            >
              <Avatar className="h-9 w-9">
                {signal.profiles?.avatar_url && (
                  <AvatarImage src={signal.profiles.avatar_url} alt={signal.profiles.display_name ?? ""} />
                )}
                <AvatarFallback className="text-sm bg-accent/20 text-accent">
                  {signal.profiles?.display_name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-base text-text-primary">
                {signal.profiles?.display_name || t("common:unknown")}
              </span>
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant="outline" className="border-accent/40 text-accent text-xs">
                  {remainingText}
                </Badge>
                {signal.formats.map((f: MtgFormat) => (
                  <FormatBadge key={f} format={f} />
                ))}
                {signal.preferred_slot && (
                  <Badge variant="outline" className="border-accent/40 text-accent text-xs">
                    {t(`profile:${signal.preferred_slot}_slot`)}
                  </Badge>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
