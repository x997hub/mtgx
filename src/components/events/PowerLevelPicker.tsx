import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PowerLevelPickerProps {
  value: number | null;
  onChange: (level: number) => void;
}

const POWER_LEVELS = [
  { level: 1, labelKey: "power_1", fallback: "Jank" },
  { level: 2, labelKey: "power_2", fallback: "Casual" },
  { level: 3, labelKey: "power_3", fallback: "Focused" },
  { level: 4, labelKey: "power_4", fallback: "Optimized" },
  { level: 5, labelKey: "power_5", fallback: "cEDH" },
] as const;

const LEVEL_COLORS: Record<number, { active: string; inactive: string }> = {
  1: { active: "bg-emerald-700 text-emerald-100", inactive: "bg-gray-700 text-gray-400" },
  2: { active: "bg-teal-700 text-teal-100", inactive: "bg-gray-700 text-gray-400" },
  3: { active: "bg-amber-700 text-amber-100", inactive: "bg-gray-700 text-gray-400" },
  4: { active: "bg-orange-700 text-orange-100", inactive: "bg-gray-700 text-gray-400" },
  5: { active: "bg-red-700 text-red-100", inactive: "bg-gray-700 text-gray-400" },
};

export function PowerLevelPicker({ value, onChange }: PowerLevelPickerProps) {
  const { t } = useTranslation("events");

  return (
    <div className="space-y-2">
      <Label>{t("power_level", "Commander Power Level")}</Label>
      <div className="flex flex-wrap gap-2">
        {POWER_LEVELS.map(({ level, labelKey, fallback }) => {
          const active = value === level;
          const colors = LEVEL_COLORS[level];
          return (
            <button
              key={level}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(level)}
              className={cn(
                "flex flex-col items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors min-w-[60px]",
                active ? colors.active : colors.inactive
              )}
            >
              <span className="text-lg font-bold">{level}</span>
              <span className="text-xs">{t(labelKey, fallback)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Small inline badge for displaying power level */
export function PowerLevelBadge({ level }: { level: number }) {
  const { t } = useTranslation("events");
  const labels: Record<number, string> = { 1: "Jank", 2: "Casual", 3: "Focused", 4: "Optimized", 5: "cEDH" };
  const colors: Record<number, string> = {
    1: "bg-emerald-700/30 text-emerald-300",
    2: "bg-teal-700/30 text-teal-300",
    3: "bg-amber-700/30 text-amber-300",
    4: "bg-orange-700/30 text-orange-300",
    5: "bg-red-700/30 text-red-300",
  };

  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", colors[level] ?? "bg-gray-700 text-gray-300")}>
      {t(`power_${level}`, labels[level] ?? String(level))}
    </span>
  );
}
