import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FABProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function FAB({ onClick, children, className }: FABProps) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "fixed bottom-20 right-4 z-30 h-14 rounded-full px-5 shadow-lg shadow-accent/25 md:hidden",
        className
      )}
      size="lg"
    >
      {children}
    </Button>
  );
}
