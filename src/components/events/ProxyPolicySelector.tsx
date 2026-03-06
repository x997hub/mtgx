import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProxyPolicy } from "@/types/database.types";

interface ProxyPolicySelectorProps {
  value: ProxyPolicy;
  onChange: (v: ProxyPolicy) => void;
}

const PROXY_OPTIONS: { value: ProxyPolicy; labelKey: string }[] = [
  { value: "none", labelKey: "proxy_none" },
  { value: "partial", labelKey: "proxy_partial" },
  { value: "full", labelKey: "proxy_full" },
];

export function ProxyPolicySelector({ value, onChange }: ProxyPolicySelectorProps) {
  const { t } = useTranslation("events");

  return (
    <div className="space-y-2">
      <Label>{t("proxy_policy", "Proxy Policy")}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as ProxyPolicy)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROXY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {t(opt.labelKey, opt.value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
