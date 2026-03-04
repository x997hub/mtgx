import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { useEvents } from "@/hooks/useEvents";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/use-toast";
const FORMATS = ["pauper", "commander", "standard", "draft"];
export function BigEventForm({ defaultValues }) {
    const { t } = useTranslation("events");
    const navigate = useNavigate();
    const { createEvent, isCreating } = useEvents();
    const user = useAuthStore((s) => s.user);
    const [title, setTitle] = useState(defaultValues?.title ?? "");
    const [format, setFormat] = useState(defaultValues?.format ?? "pauper");
    const [startsAt, setStartsAt] = useState("");
    const [venueId] = useState(defaultValues?.venue_id ?? "");
    const [city, setCity] = useState("");
    const [minPlayers, setMinPlayers] = useState(defaultValues?.min_players ?? 4);
    const [maxPlayers, setMaxPlayers] = useState(defaultValues?.max_players ?? 16);
    const [feeText, setFeeText] = useState(defaultValues?.fee_text ?? "");
    const [description, setDescription] = useState(defaultValues?.description ?? "");
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user)
            return;
        try {
            await createEvent({
                organizer_id: user.id,
                type: "big",
                title,
                format,
                city,
                starts_at: new Date(startsAt).toISOString(),
                venue_id: venueId || null,
                min_players: minPlayers,
                max_players: maxPlayers,
                fee_text: feeText || null,
                description: description || null,
            });
            toast({ title: t("event_created") });
            navigate("/");
        }
        catch {
            toast({ title: t("common:error"), variant: "destructive" });
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "title", children: t("event_title") }), _jsx(Input, { id: "title", value: title, onChange: (e) => setTitle(e.target.value), required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: t("format") }), _jsxs(Select, { value: format, onValueChange: (v) => setFormat(v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: FORMATS.map((f) => (_jsx(SelectItem, { value: f, children: t(f) }, f))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "starts_at", children: t("date_time") }), _jsx(Input, { id: "starts_at", type: "datetime-local", value: startsAt, onChange: (e) => setStartsAt(e.target.value), required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "city", children: t("city") }), _jsx(Input, { id: "city", value: city, onChange: (e) => setCity(e.target.value), required: true })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "min_players", children: t("min_players") }), _jsx(Input, { id: "min_players", type: "number", min: 2, value: minPlayers, onChange: (e) => setMinPlayers(Number(e.target.value)) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "max_players", children: t("max_players") }), _jsx(Input, { id: "max_players", type: "number", min: 2, value: maxPlayers, onChange: (e) => setMaxPlayers(Number(e.target.value)) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "fee", children: t("fee") }), _jsx(Input, { id: "fee", value: feeText, onChange: (e) => setFeeText(e.target.value) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "description", children: t("description") }), _jsx("textarea", { id: "description", value: description, onChange: (e) => setDescription(e.target.value), rows: 3, className: "flex w-full rounded-md border border-gray-600 bg-[#1a1a2e] px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e94560]" })] }), _jsx(Button, { type: "submit", className: "w-full min-h-[44px]", disabled: isCreating, children: isCreating ? t("common:loading") : t("create_big_event") })] }));
}
