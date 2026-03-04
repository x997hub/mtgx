import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type DayOfWeek = Database["public"]["Enums"]["day_of_week"];
type TimeSlot = Database["public"]["Enums"]["time_slot"];

const DAYS: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const SLOTS: TimeSlot[] = ["day", "evening"];

interface AvailabilityChipsProps {
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export function AvailabilityChips({ selected, onChange }: AvailabilityChipsProps) {
  const { t } = useTranslation("profile");

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">{t("availability_description")}</p>
      <div className="flex flex-wrap gap-2">
        {DAYS.flatMap((day) =>
          SLOTS.map((slot) => {
            const key = `${day}_${slot}`;
            const isSelected = selected.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors min-h-[36px]",
                  isSelected
                    ? "border-[#e94560] bg-[#e94560]/20 text-[#e94560]"
                    : "border-gray-600 text-gray-400 hover:border-gray-500"
                )}
              >
                {t(day)} {t(`${slot}_slot`)}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
