import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    positive: boolean;
  };
}

export function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="relative pt-6">
        <div className="absolute top-4 right-4 text-text-muted">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-bold font-mono text-text-primary">
            {value}
          </p>
          {trend && (
            <p
              className={`text-sm font-medium ${
                trend.positive ? "text-green-500" : "text-red-500"
              }`}
            >
              {trend.positive ? "\u2191" : "\u2193"}
              {Math.abs(trend.value)}%
            </p>
          )}
          <p className="text-sm text-text-secondary">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
