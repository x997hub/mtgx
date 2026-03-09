import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MOOD_TAG_COLORS, MOOD_TAG_LABELS } from "@/lib/constants";

interface MoodTagBadgeProps {
  tag: string;
  className?: string;
}

export function MoodTagBadge({ tag, className }: MoodTagBadgeProps) {
  const colors = MOOD_TAG_COLORS[tag] ?? "bg-border/30 text-text-secondary border-border/50";
  const label = MOOD_TAG_LABELS[tag] ?? tag;

  return (
    <Badge
      className={cn("text-xs px-2 py-0.5", colors, className)}
    >
      {label}
    </Badge>
  );
}
