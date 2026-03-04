import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CityBadgeProps {
  city: string;
  className?: string;
}

export function CityBadge({ city, className }: CityBadgeProps) {
  return (
    <Badge variant="outline" className={cn("text-gray-300", className)}>
      {city}
    </Badge>
  );
}
