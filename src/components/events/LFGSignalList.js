import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { useLFG } from "@/hooks/useLFG";
export function LFGSignalList({ city }) {
    const { t } = useTranslation("events");
    const { signals, isSignalsLoading } = useLFG(city);
    if (isSignalsLoading || signals.length === 0)
        return null;
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-medium text-[#e94560]", children: [_jsx(Zap, { className: "h-4 w-4" }), t("lfg_banner", { count: signals.length })] }), _jsx("ul", { className: "space-y-1", children: signals.map((signal) => (_jsxs("li", { className: "flex items-center gap-3 rounded-lg bg-[#e94560]/5 border border-[#e94560]/20 px-3 py-2", children: [_jsx(Avatar, { className: "h-7 w-7", children: _jsx(AvatarFallback, { className: "text-xs bg-[#e94560]/20 text-[#e94560]", children: signal.profiles?.display_name?.charAt(0)?.toUpperCase() || "?" }) }), _jsx("span", { className: "flex-1 text-sm text-text-primary", children: signal.profiles?.display_name || "Unknown" }), _jsx("div", { className: "flex gap-1", children: signal.formats.map((f) => (_jsx(FormatBadge, { format: f }, f))) })] }, signal.id))) })] }));
}
