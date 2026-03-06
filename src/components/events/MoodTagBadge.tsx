import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MoodTagBadgeProps {
  tag: string;
  className?: string;
}

const TAG_COLORS: Record<string, string> = {
  casual: "bg-emerald-700/30 text-emerald-300 border-emerald-700/50",
  competitive: "bg-red-700/30 text-red-300 border-red-700/50",
  deck_test: "bg-blue-700/30 text-blue-300 border-blue-700/50",
  training: "bg-purple-700/30 text-purple-300 border-purple-700/50",
};

const TAG_LABELS: Record<string, string> = {
  casual: "Casual",
  competitive: "Competitive",
  deck_test: "Deck Test",
  training: "Training",
};

export function MoodTagBadge({ tag, className }: MoodTagBadgeProps) {
  const colors = TAG_COLORS[tag] ?? "bg-gray-700/30 text-gray-300 border-gray-700/50";
  const label = TAG_LABELS[tag] ?? tag;

  return (
    <Badge
      className={cn("text-xs px-2 py-0.5", colors, className)}
    >
      {label}
    </Badge>
  );
}
