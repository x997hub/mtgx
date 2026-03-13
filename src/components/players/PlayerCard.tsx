import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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

const AVAIL_COLORS: Record<AvailabilityLevel, string> = {
  available: "bg-emerald-500",
  sometimes: "bg-amber-500",
  unavailable: "bg-transparent",
};

export function PlayerCard({ player, availability, showReliability }: PlayerCardProps) {
  const { t } = useTranslation(["profile", "common"]);

  // Build availability lookup: "day-slot" → level (memoized)
  const availMap = useMemo(() => {
    const map = new Map<string, AvailabilityLevel>();
    for (const a of availability) {
      map.set(`${a.day}-${a.slot}`, a.level);
    }
    return map;
  }, [availability]);

  const initials = getInitials(player.display_name);

  return (
    <Link to={`/profile/${player.id}`}>
      <Card className="h-full bg-secondary border-border hover:border-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-4 space-y-3">
          {/* Header: Avatar + Name + City + Role */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              {player.avatar_url && (
                <AvatarImage src={player.avatar_url} alt={player.display_name} />
              )}
              <AvatarFallback className="bg-primary text-accent text-sm font-bold">
                {initials || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-base font-medium text-text-primary truncate">
                {player.display_name}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-text-secondary truncate">{player.city}</p>
                {player.role !== "player" && (
                  <Badge variant="outline" className="text-[10px] leading-tight border-accent/50 text-accent shrink-0 px-1.5 py-0">
                    {t(`profile:role_${player.role}`)}
                  </Badge>
                )}
              </div>
            </div>
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
              <p className="text-[10px] text-text-muted uppercase tracking-wider">
                {t("profile:availability")}
              </p>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((day) => (
                  <div key={day} className="text-center">
                    <span className="text-[9px] text-text-muted block mb-0.5">
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
                              ? "bg-border w-2"
                              : cn(AVAIL_COLORS[level], "w-3")
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
            <div className="flex items-center justify-between text-xs text-text-secondary">
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
