import { jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
const FORMATS = ["pauper", "commander", "standard", "draft"];
const FORMAT_COLORS = {
    pauper: "border-emerald-600 bg-emerald-600/20 text-emerald-400",
    commander: "border-purple-600 bg-purple-600/20 text-purple-400",
    standard: "border-blue-600 bg-blue-600/20 text-blue-400",
    draft: "border-amber-600 bg-amber-600/20 text-amber-400",
};
export function FormatPicker({ selected, onChange }) {
    const { t } = useTranslation("events");
    const toggle = (format) => {
        if (selected.includes(format)) {
            onChange(selected.filter((f) => f !== format));
        }
        else {
            onChange([...selected, format]);
        }
    };
    return (_jsx("div", { className: "flex flex-wrap gap-2", children: FORMATS.map((format) => {
            const isSelected = selected.includes(format);
            return (_jsx("button", { type: "button", onClick: () => toggle(format), className: cn("rounded-full border px-4 py-2 text-sm font-medium transition-colors min-h-[44px]", isSelected
                    ? FORMAT_COLORS[format]
                    : "border-gray-600 text-gray-400 hover:border-gray-500"), children: t(format) }, format));
        }) }));
}
