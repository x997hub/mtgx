import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { DAYS, SLOTS } from "@/lib/constants";
import { cn, getInitials } from "@/lib/utils";
import type { Database, AvailabilityLevel } from "@/types/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type AvailabilityRow = Database["public"]["Tables"]["availability"]["Row"];

interface PlayerCardProps {
  player: ProfileRow;
  availability: AvailabilityRow[];
  showReliability?: boolean;
}

const LEVEL_COLORS: Record<AvailabilityLevel, string> = {
  available: "bg-emerald-500",
  sometimes: "bg-amber-500",
  unavailable: "bg-transparent",
};

export function PlayerCard({ player, availability, showReliability }: PlayerCardProps) {
  const { t } = useTranslation(["profile", "common"]);

  // Build availability lookup: "day-slot" → level
  const availMap = new Map<string, AvailabilityLevel>();
  for (const a of availability) {
    availMap.set(`${a.day}-${a.slot}`, a.level);
  }

  const initials = getInitials(player.display_name);

  return (
    <Link to={`/profile/${player.id}`}>
      <Card className="bg-secondary border-gray-700 hover:border-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-4 space-y-3">
          {/* Header: Avatar + Name + City */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-accent text-sm font-bold">
                {initials || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-gray-100 truncate">
                {player.display_name}
              </p>
              <p className="text-sm text-gray-400">{player.city}</p>
            </div>
            {player.role !== "player" && (
              <Badge variant="outline" className="text-xs border-accent/50 text-accent shrink-0">
                {t(`profile:role_${player.role}`)}
              </Badge>
            )}
          </div>

          {/* Format badges */}
          {player.formats.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {player.formats.map((f) => (
                <FormatBadge key={f} format={f} className="text-xs px-2 py-0.5" />
              ))}
            </div>
          )}

          {/* Mini availability grid: 7 cols × 3 rows */}
          {availability.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                {t("profile:availability")}
              </p>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((day) => (
                  <div key={day} className="text-center">
                    <span className="text-[9px] text-gray-500 block mb-0.5">
                      {t(`profile:${day}`)}
                    </span>
                    {SLOTS.map((slot) => {
                      const level = availMap.get(`${day}-${slot}`) ?? "unavailable";
                      return (
                        <div
                          key={slot}
                          className={cn(
                            "h-1.5 rounded-full mx-auto mb-0.5",
                            level === "unavailable"
                              ? "bg-gray-700 w-2"
                              : cn(LEVEL_COLORS[level], "w-3")
                          )}
                          title={`${t(`profile:${day}`)} ${t(`profile:${slot}_slot`)}: ${t(`profile:${level}`)}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reliability (only for organizers/admins) */}
          {showReliability && (
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{t("profile:reliability_score")}</span>
              <span
                className={cn(
                  "font-medium",
                  player.reliability_score >= 0.8
                    ? "text-emerald-400"
                    : player.reliability_score >= 0.5
                      ? "text-amber-400"
                      : "text-red-400"
                )}
              >
                {Math.round(player.reliability_score * 100)}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
