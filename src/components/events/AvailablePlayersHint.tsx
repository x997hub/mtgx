import { useTranslation } from "react-i18next";
import { useAvailablePlayersCount } from "@/hooks/useAvailablePlayersCount";
import { Users } from "lucide-react";
import type { MtgFormat } from "@/types/database.types";

interface AvailablePlayersHintProps {
  city: string;
  format: MtgFormat | "";
  startsAt: string;
}

export function AvailablePlayersHint({ city, format, startsAt }: AvailablePlayersHintProps) {
  const { t } = useTranslation("profile");
  const { data: count } = useAvailablePlayersCount(city, format, startsAt);

  if (!count || count === 0) return null;

  return (
    <p className="flex items-center gap-1.5 text-sm text-emerald-400">
      <Users className="h-3.5 w-3.5" />
      {t("available_players_hint", { count })}
    </p>
  );
}
