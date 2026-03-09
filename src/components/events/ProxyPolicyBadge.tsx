import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProxyPolicy } from "@/types/database.types";

interface ProxyPolicyBadgeProps {
  policy: ProxyPolicy;
  className?: string;
}

const POLICY_STYLES: Record<string, string> = {
  partial: "bg-maybe-soft text-warning border-warning/30",
  full: "bg-going-soft text-success border-success/30",
};

export function ProxyPolicyBadge({ policy, className }: ProxyPolicyBadgeProps) {
  const { t } = useTranslation("events");

  if (policy === "none") return null;

  return (
    <Badge className={cn("text-xs px-2 py-0.5", POLICY_STYLES[policy], className)}>
      {t(`proxy_${policy}`, policy === "partial" ? "Partial Proxy" : "Full Proxy")}
    </Badge>
  );
}
