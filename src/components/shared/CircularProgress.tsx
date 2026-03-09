import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  className?: string;
}

export function CircularProgress({ value, max, size = 40, className }: CircularProgressProps) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = max > 0 ? Math.min(value / max, 1) : 0;
  const dashoffset = circumference * (1 - percentage);

  const getColor = () => {
    if (percentage >= 0.9) return "text-red-400";
    if (percentage >= 0.6) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          className="text-border"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className={getColor()}
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-text-secondary">
        {value}/{max}
      </span>
    </div>
  );
}
