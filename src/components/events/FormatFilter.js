import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { useFilterStore } from "@/store/filterStore";
const FORMATS = ["pauper", "commander", "standard", "draft"];
export function FormatFilter() {
    const { t } = useTranslation("events");
    const { format, setFormat } = useFilterStore();
    return (_jsxs(Select, { value: format ?? "all", onValueChange: (v) => setFormat(v === "all" ? null : v), children: [_jsx(SelectTrigger, { className: "w-[140px]", children: _jsx(SelectValue, { placeholder: t("all_formats") }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: t("all_formats") }), FORMATS.map((f) => (_jsx(SelectItem, { value: f, children: t(f) }, f)))] })] }));
}
