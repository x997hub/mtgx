import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { FORMATS, CITIES } from "@/lib/constants";
export function EventFormFields({ format, onFormatChange, city, onCityChange, startsAt, onStartsAtChange, minPlayers, onMinPlayersChange, idPrefix = "", }) {
    const { t } = useTranslation("events");
    const id = (name) => `${idPrefix}${name}`;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: t("format") }), _jsxs(Select, { value: format, onValueChange: (v) => onFormatChange(v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: FORMATS.map((f) => (_jsx(SelectItem, { value: f, children: t(f) }, f))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: t("city") }), _jsxs(Select, { value: city, onValueChange: onCityChange, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: t("city") }) }), _jsx(SelectContent, { children: CITIES.map((c) => (_jsx(SelectItem, { value: c, children: c }, c))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: id("starts_at"), children: t("date_time") }), _jsx(Input, { id: id("starts_at"), type: "datetime-local", value: startsAt, onChange: (e) => onStartsAtChange(e.target.value), required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: id("min_players"), children: t("min_players") }), _jsx(Input, { id: id("min_players"), type: "number", min: 2, value: minPlayers, onChange: (e) => onMinPlayersChange(Number(e.target.value)) })] })] }));
}
