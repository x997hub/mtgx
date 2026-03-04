import { cn } from "@/lib/utils";

interface FormLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function FormLayout({ children, className }: FormLayoutProps) {
  return (
    <div className={cn("mx-auto w-full max-w-lg px-4 py-6", className)}>
      {children}
    </div>
  );
}
