import { jsx as _jsx } from "react/jsx-runtime";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
const FORMAT_COLORS = {
    pauper: "bg-emerald-700 text-emerald-100",
    commander: "bg-purple-700 text-purple-100",
    standard: "bg-blue-700 text-blue-100",
    draft: "bg-amber-700 text-amber-100",
};
export function FormatBadge({ format, className }) {
    const { t } = useTranslation("events");
    return (_jsx(Badge, { className: cn("border-none", FORMAT_COLORS[format], className), children: t(format) }));
}
