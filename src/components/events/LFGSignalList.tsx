import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
      <div className="flex items-center gap-2 text-sm font-medium text-accent">
        <Zap className="h-4 w-4" />
        {t("lfg_banner", { count: signals.length })}
      </div>
      <ul className="space-y-1">
        {signals.map((signal) => (
          <li
            key={signal.id}
            className="flex items-center gap-3 rounded-lg bg-accent/5 border border-accent/20 px-3 py-2"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-accent/20 text-accent">
                {signal.profiles?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm text-text-primary">
              {signal.profiles?.display_name || t("common:unknown")}
            </span>
            <div className="flex gap-1">
              {signal.formats.map((f: MtgFormat) => (
                <FormatBadge key={f} format={f} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
