import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-3 py-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-accent text-white shadow",
        secondary:
          "border-transparent bg-secondary text-text-primary",
        destructive:
          "border-transparent bg-red-700 text-white shadow",
        outline: "border-border text-text-secondary",
        soft: "border-transparent bg-accent-soft text-accent",
        success: "border-transparent bg-going-soft text-success",
        danger: "border-transparent bg-not-going-soft text-danger",
        warning: "border-transparent bg-maybe-soft text-warning",
        info: "border-transparent bg-info/10 text-info",
        neutral: "border-transparent bg-surface-hover text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
