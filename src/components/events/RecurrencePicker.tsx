import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DAYS } from "@/lib/constants";
import type { DayOfWeek } from "@/types/database.types";

export interface RecurrenceConfig {
  days: DayOfWeek[];
  until?: string;
}

interface RecurrencePickerProps {
  value: RecurrenceConfig | null;
  onChange: (config: RecurrenceConfig | null) => void;
}

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const { t } = useTranslation(["events", "profile"]);

  const isEnabled = value !== null;

  const handleToggle = () => {
    if (isEnabled) {
      onChange(null);
    } else {
      onChange({ days: [] });
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    if (!value) return;
    const newDays = value.days.includes(day)
      ? value.days.filter((d) => d !== day)
      : [...value.days, day];
    onChange({ ...value, days: newDays });
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={handleToggle}
          className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-accent focus:ring-accent"
        />
        <span className="text-base font-medium text-gray-200">
          {t("events:make_recurring", "Make recurring")}
        </span>
      </label>

      {isEnabled && (
        <div className="space-y-3 ps-1">
          {/* Day selector */}
          <div className="space-y-2">
            <Label>{t("events:recurrence_days", "Repeat on")}</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const active = value?.days.includes(day) ?? false;
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-medium transition-colors min-w-[42px]",
                      active
                        ? "bg-accent text-white"
                        : "bg-gray-700 text-gray-400"
                    )}
                  >
                    {t(`profile:${day}_short`, day.substring(0, 2).toUpperCase())}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Until date */}
          <div className="space-y-2">
            <Label htmlFor="recurrence_until">
              {t("events:recurrence_until", "Repeat until (optional)")}
            </Label>
            <Input
              id="recurrence_until"
              type="date"
              value={value?.until ?? ""}
              onChange={(e) =>
                onChange({ ...value!, until: e.target.value || undefined })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
