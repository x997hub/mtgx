import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { FORMATS, CITIES, DAYS, SLOTS } from "@/lib/constants";
import { Loader2, Save } from "lucide-react";
const LEVELS = ["available", "sometimes", "unavailable"];
const LEVEL_COLORS = {
    available: "bg-emerald-600 hover:bg-emerald-500",
    sometimes: "bg-amber-600 hover:bg-amber-500",
    unavailable: "bg-gray-700 hover:bg-gray-600",
};
const FORMAT_COLORS = {
    pauper: { active: "bg-emerald-700 text-emerald-100", inactive: "bg-gray-700 text-gray-400" },
    commander: { active: "bg-purple-700 text-purple-100", inactive: "bg-gray-700 text-gray-400" },
    standard: { active: "bg-blue-700 text-blue-100", inactive: "bg-gray-700 text-gray-400" },
    draft: { active: "bg-amber-700 text-amber-100", inactive: "bg-gray-700 text-gray-400" },
};
export default function ProfileEditPage() {
    const { t } = useTranslation("profile");
    const { t: tc } = useTranslation("common");
    const { t: te } = useTranslation("events");
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile, availability, isLoading, updateProfile, updateAvailability, isUpdating } = useProfile();
    const { toast } = useToast();
    const [displayName, setDisplayName] = useState("");
    const [city, setCity] = useState("");
    const [formats, setFormats] = useState([]);
    const [whatsapp, setWhatsapp] = useState("");
    const [grid, setGrid] = useState({});
    useEffect(() => {
        if (profile) {
            setDisplayName(profile.display_name);
            setCity(profile.city);
            setFormats(profile.formats);
            setWhatsapp(profile.whatsapp ?? "");
        }
    }, [profile]);
    useEffect(() => {
        if (availability.length > 0) {
            const map = {};
            for (const a of availability) {
                map[`${a.day}-${a.slot}`] = a.level;
            }
            setGrid(map);
        }
    }, [availability]);
    function toggleFormat(format) {
        setFormats((prev) => prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]);
    }
    function cycleLevel(day, slot) {
        const key = `${day}-${slot}`;
        const current = grid[key] ?? "unavailable";
        const idx = LEVELS.indexOf(current);
        const next = LEVELS[(idx + 1) % LEVELS.length];
        setGrid((prev) => ({ ...prev, [key]: next }));
    }
    async function handleSave() {
        if (!user)
            return;
        try {
            await updateProfile({
                display_name: displayName,
                city,
                formats,
                whatsapp: whatsapp || null,
            });
            const slots = [];
            for (const day of DAYS) {
                for (const slot of SLOTS) {
                    const level = grid[`${day}-${slot}`];
                    if (level && level !== "unavailable") {
                        slots.push({ user_id: user.id, day, slot, level });
                    }
                }
            }
            await updateAvailability(slots);
            toast({ title: t("profile_saved") });
            navigate("/profile");
        }
        catch {
            toast({ title: tc("error"), variant: "destructive" });
        }
    }
    if (isLoading) {
        return (_jsxs("div", { className: "min-h-screen bg-surface p-4 space-y-4", children: [_jsx(Skeleton, { className: "h-12 w-full rounded-xl" }), _jsx(Skeleton, { className: "h-40 w-full rounded-xl" }), _jsx(Skeleton, { className: "h-32 w-full rounded-xl" })] }));
    }
    return (_jsx("div", { className: "min-h-screen bg-surface text-text-primary", children: _jsxs("div", { className: "mx-auto max-w-lg space-y-4 p-4", children: [_jsx("h1", { className: "text-xl font-bold text-gray-100", children: t("edit_profile") }), _jsx(Card, { children: _jsxs(CardContent, { className: "space-y-3 p-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "displayName", children: t("display_name") }), _jsx(Input, { id: "displayName", value: displayName, onChange: (e) => setDisplayName(e.target.value) })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: t("city") }), _jsxs(Select, { value: city, onValueChange: setCity, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: t("select_city") }) }), _jsx(SelectContent, { children: CITIES.map((c) => (_jsx(SelectItem, { value: c, children: c }, c))) })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "whatsapp", children: t("whatsapp") }), _jsx(Input, { id: "whatsapp", type: "tel", value: whatsapp, onChange: (e) => setWhatsapp(e.target.value), placeholder: t("whatsapp_placeholder") })] })] }) }), _jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm text-gray-400", children: t("formats") }) }), _jsx(CardContent, { children: _jsx("div", { className: "flex flex-wrap gap-2", children: FORMATS.map((format) => {
                                    const active = formats.includes(format);
                                    const colors = FORMAT_COLORS[format];
                                    return (_jsx("button", { type: "button", onClick: () => toggleFormat(format), className: `rounded-full px-3 py-1 text-sm font-medium transition-colors ${active ? colors.active : colors.inactive}`, children: te(format) }, format));
                                }) }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { className: "pb-2", children: [_jsx(CardTitle, { className: "text-sm text-gray-400", children: t("availability") }), _jsx("p", { className: "text-xs text-gray-500", children: t("availability_description") })] }), _jsx(CardContent, { children: _jsxs("div", { className: "overflow-x-auto", children: [_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "p-1 text-left text-gray-400" }), DAYS.map((day) => (_jsx("th", { className: "p-1 text-center text-gray-400 font-normal", children: t(day) }, day)))] }) }), _jsx("tbody", { children: SLOTS.map((slot) => (_jsxs("tr", { children: [_jsx("td", { className: "p-1 text-gray-400 whitespace-nowrap", children: t(slot === "day" ? "day_slot" : "evening_slot") }), DAYS.map((day) => {
                                                            const key = `${day}-${slot}`;
                                                            const level = grid[key] ?? "unavailable";
                                                            return (_jsx("td", { className: "p-1 text-center", children: _jsx("button", { type: "button", onClick: () => cycleLevel(day, slot), className: `mx-auto h-8 w-8 rounded transition-colors ${LEVEL_COLORS[level]}`, title: t(level) }) }, day));
                                                        })] }, slot))) })] }), _jsxs("div", { className: "mt-2 flex items-center gap-3 text-xs text-gray-400", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "inline-block h-3 w-3 rounded bg-emerald-600" }), " ", t("available")] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "inline-block h-3 w-3 rounded bg-amber-600" }), " ", t("sometimes")] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "inline-block h-3 w-3 rounded bg-gray-700" }), " ", t("unavailable")] })] })] }) })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { variant: "outline", className: "flex-1", onClick: () => navigate("/profile"), children: tc("cancel") }), _jsxs(Button, { className: "flex-1", onClick: handleSave, disabled: isUpdating || !displayName.trim() || !city, children: [isUpdating ? (_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" })) : (_jsx(Save, { className: "mr-2 h-4 w-4" })), tc("save")] })] })] }) }));
}
