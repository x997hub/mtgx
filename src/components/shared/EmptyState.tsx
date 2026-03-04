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
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#16213e]">
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
      )}
      <h3 className="mb-1 text-lg font-semibold text-gray-200">{title}</h3>
      {description && <p className="mb-4 max-w-sm text-sm text-gray-400">{description}</p>}
      {children && <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
