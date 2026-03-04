import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { useFilterStore } from "@/store/filterStore";
import { CITIES } from "@/lib/constants";
export function CityFilter() {
    const { t } = useTranslation("events");
    const { city, setCity } = useFilterStore();
    return (_jsxs(Select, { value: city ?? "all", onValueChange: (v) => setCity(v === "all" ? null : v), children: [_jsx(SelectTrigger, { className: "w-[140px]", children: _jsx(SelectValue, { placeholder: t("all_cities") }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: t("all_cities") }), CITIES.map((c) => (_jsx(SelectItem, { value: c, children: c }, c)))] })] }));
}
