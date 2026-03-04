import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const SLOTS = ["day", "evening"];
const LEVEL_CYCLE = ["unavailable", "available", "sometimes"];
const LEVEL_COLORS = {
    available: "bg-emerald-600 border-emerald-500",
    sometimes: "bg-amber-600 border-amber-500",
    unavailable: "bg-gray-700 border-gray-600",
};
export function AvailabilityGrid({ value, onChange, readOnly }) {
    const { t } = useTranslation("profile");
    const getLevel = (day, slot) => {
        return value[`${day}_${slot}`] || "unavailable";
    };
    const handleClick = (day, slot) => {
        if (readOnly || !onChange)
            return;
        const key = `${day}_${slot}`;
        const current = getLevel(day, slot);
        const currentIdx = LEVEL_CYCLE.indexOf(current);
        const next = LEVEL_CYCLE[(currentIdx + 1) % LEVEL_CYCLE.length];
        onChange({ ...value, [key]: next });
    };
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "grid grid-cols-8 gap-1", children: [_jsx("div", {}), DAYS.map((day) => (_jsx("div", { className: "text-center text-xs text-gray-400", children: t(day) }, day)))] }), SLOTS.map((slot) => (_jsxs("div", { className: "grid grid-cols-8 gap-1", children: [_jsx("div", { className: "flex items-center text-xs text-gray-400", children: t(`${slot}_slot`) }), DAYS.map((day) => {
                        const level = getLevel(day, slot);
                        return (_jsx("button", { type: "button", onClick: () => handleClick(day, slot), disabled: readOnly, className: cn("h-10 rounded border transition-colors", LEVEL_COLORS[level], !readOnly && "cursor-pointer hover:opacity-80"), title: t(level) }, `${day}_${slot}`));
                    })] }, slot))), _jsx("div", { className: "flex gap-4 text-xs text-gray-400", children: LEVEL_CYCLE.filter((l) => l !== "unavailable").map((level) => (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("div", { className: cn("h-3 w-3 rounded", LEVEL_COLORS[level]) }), t(level)] }, level))) })] }));
}
