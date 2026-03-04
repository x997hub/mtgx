import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
export function EventTypeToggle({ value, onChange }) {
    const { t } = useTranslation("events");
    return (_jsxs(ToggleGroup, { type: "single", value: value, onValueChange: (v) => {
            if (v)
                onChange(v);
        }, className: "w-full", variant: "outline", children: [_jsx(ToggleGroupItem, { value: "big", className: "flex-1 min-h-[44px]", children: t("big_event") }), _jsx(ToggleGroupItem, { value: "quick", className: "flex-1 min-h-[44px]", children: t("quick_meetup") })] }));
}
