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
  1: { active: "bg-success text-white", inactive: "bg-border text-text-secondary" },
  2: { active: "bg-success/80 text-white", inactive: "bg-border text-text-secondary" },
  3: { active: "bg-warning text-white", inactive: "bg-border text-text-secondary" },
  4: { active: "bg-warning/80 text-white", inactive: "bg-border text-text-secondary" },
  5: { active: "bg-danger text-white", inactive: "bg-border text-text-secondary" },
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
    1: "bg-going-soft text-success",
    2: "bg-going-soft text-success",
    3: "bg-maybe-soft text-warning",
    4: "bg-maybe-soft text-warning",
    5: "bg-not-going-soft text-danger",
  };

  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", colors[level] ?? "bg-border text-text-secondary")}>
      {t(`power_${level}`, labels[level] ?? String(level))}
    </span>
  );
}
