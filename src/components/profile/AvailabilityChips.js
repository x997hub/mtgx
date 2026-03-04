import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const SLOTS = ["day", "evening"];
export function AvailabilityChips({ selected, onChange }) {
    const { t } = useTranslation("profile");
    const toggle = (key) => {
        const next = new Set(selected);
        if (next.has(key)) {
            next.delete(key);
        }
        else {
            next.add(key);
        }
        onChange(next);
    };
    return (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-gray-400", children: t("availability_description") }), _jsx("div", { className: "flex flex-wrap gap-2", children: DAYS.flatMap((day) => SLOTS.map((slot) => {
                    const key = `${day}_${slot}`;
                    const isSelected = selected.has(key);
                    return (_jsxs("button", { type: "button", onClick: () => toggle(key), "aria-pressed": isSelected, className: cn("rounded-full border px-3 py-1.5 text-sm transition-colors min-h-[36px]", isSelected
                            ? "border-[#e94560] bg-[#e94560]/20 text-[#e94560]"
                            : "border-gray-600 text-gray-400 hover:border-gray-500"), children: [t(day), " ", t(`${slot}_slot`)] }, key));
                })) })] }));
}
