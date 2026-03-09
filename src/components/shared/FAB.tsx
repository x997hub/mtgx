import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FABProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function FAB({ onClick, children, className, "aria-label": ariaLabel }: FABProps) {
  return (
    <Button
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "fixed bottom-[80px] end-4 z-30 h-14 rounded-full px-6 shadow-lg shadow-accent/25 md:hidden",
        className
      )}
      size="lg"
    >
      {children}
    </Button>
  );
}
