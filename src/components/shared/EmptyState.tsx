import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, children, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <Icon className="h-8 w-8 text-text-secondary" />
        </div>
      )}
      <h3 className="mb-1 text-xl font-semibold text-text-primary">{title}</h3>
      {description && <p className="mb-4 max-w-sm text-base text-text-secondary">{description}</p>}
      {children && <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
