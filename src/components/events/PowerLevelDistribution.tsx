import { useTranslation } from "react-i18next";

interface PowerLevelDistributionProps {
  levels: (number | null | undefined)[];
}

const LEVEL_LABELS: Record<number, string> = {
  1: "power_1",
  2: "power_2",
  3: "power_3",
  4: "power_4",
  5: "power_5",
};

export function PowerLevelDistribution({ levels }: PowerLevelDistributionProps) {
  const { t } = useTranslation("events");

  const validLevels = levels.filter(
    (l): l is number => l != null && l >= 1 && l <= 5,
  );

  if (validLevels.length === 0) return null;

  // Count occurrences
  const counts: Record<number, number> = {};
  for (const level of validLevels) {
    counts[level] = (counts[level] || 0) + 1;
  }

  // Build distribution string
  const parts = Object.entries(counts)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([level, count]) => `${count}x ${t(LEVEL_LABELS[Number(level)], level)}`);

  return (
    <div className="text-sm text-text-secondary">
      <span className="font-medium text-text-primary">{t("commander_brackets")}:</span>{" "}
      {parts.join(", ")}
    </div>
  );
}
