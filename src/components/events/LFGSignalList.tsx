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
  const { t } = useTranslation("events");
  const { signals, isSignalsLoading } = useLFG(city);

  if (isSignalsLoading || signals.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-[#e94560]">
        <Zap className="h-4 w-4" />
        {t("lfg_banner", { count: signals.length })}
      </div>
      <ul className="space-y-1">
        {signals.map((signal) => (
          <li
            key={signal.id}
            className="flex items-center gap-3 rounded-lg bg-[#e94560]/5 border border-[#e94560]/20 px-3 py-2"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-[#e94560]/20 text-[#e94560]">
                {signal.profiles?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm text-text-primary">
              {signal.profiles?.display_name || "Unknown"}
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
