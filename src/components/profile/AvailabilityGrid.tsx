import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type DayOfWeek = Database["public"]["Enums"]["day_of_week"];
type TimeSlot = Database["public"]["Enums"]["time_slot"];
type AvailabilityLevel = Database["public"]["Enums"]["availability_level"];

const DAYS: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const SLOTS: TimeSlot[] = ["day", "evening"];

const LEVEL_CYCLE: AvailabilityLevel[] = ["unavailable", "available", "sometimes"];
const LEVEL_COLORS: Record<AvailabilityLevel, string> = {
  available: "bg-emerald-600 border-emerald-500",
  sometimes: "bg-amber-600 border-amber-500",
  unavailable: "bg-gray-700 border-gray-600",
};

interface AvailabilityGridProps {
  value: Record<string, AvailabilityLevel>;
  onChange?: (value: Record<string, AvailabilityLevel>) => void;
  readOnly?: boolean;
}

export function AvailabilityGrid({ value, onChange, readOnly }: AvailabilityGridProps) {
  const { t } = useTranslation("profile");

  const getLevel = (day: DayOfWeek, slot: TimeSlot): AvailabilityLevel => {
    return value[`${day}_${slot}`] || "unavailable";
  };

  const handleClick = (day: DayOfWeek, slot: TimeSlot) => {
    if (readOnly || !onChange) return;
    const key = `${day}_${slot}`;
    const current = getLevel(day, slot);
    const currentIdx = LEVEL_CYCLE.indexOf(current);
    const next = LEVEL_CYCLE[(currentIdx + 1) % LEVEL_CYCLE.length];
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-8 gap-1">
        <div />
        {DAYS.map((day) => (
          <div key={day} className="text-center text-xs text-gray-400">
            {t(day)}
          </div>
        ))}
      </div>
      {SLOTS.map((slot) => (
        <div key={slot} className="grid grid-cols-8 gap-1">
          <div className="flex items-center text-xs text-gray-400">
            {t(`${slot}_slot`)}
          </div>
          {DAYS.map((day) => {
            const level = getLevel(day, slot);
            return (
              <button
                key={`${day}_${slot}`}
                type="button"
                onClick={() => handleClick(day, slot)}
                disabled={readOnly}
                className={cn(
                  "h-10 rounded border transition-colors",
                  LEVEL_COLORS[level],
                  !readOnly && "cursor-pointer hover:opacity-80"
                )}
                title={t(level)}
              />
            );
          })}
        </div>
      ))}
      <div className="flex gap-4 text-xs text-gray-400">
        {LEVEL_CYCLE.filter((l) => l !== "unavailable").map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <div className={cn("h-3 w-3 rounded", LEVEL_COLORS[level])} />
            {t(level)}
          </div>
        ))}
      </div>
    </div>
  );
}
