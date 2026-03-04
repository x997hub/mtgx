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
import { FORMATS } from "@/lib/constants";
export function QuickMeetupForm() {
    const { t } = useTranslation("events");
    const navigate = useNavigate();
    const { createEvent, isCreating } = useEvents();
    const user = useAuthStore((s) => s.user);
    const [format, setFormat] = useState("pauper");
    const [startsAt, setStartsAt] = useState("");
    const [city, setCity] = useState("");
    const [minPlayers, setMinPlayers] = useState(2);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user)
            return;
        try {
            await createEvent({
                organizer_id: user.id,
                type: "quick",
                format,
                city,
                starts_at: new Date(startsAt).toISOString(),
                min_players: minPlayers,
            });
            toast({ title: t("event_created") });
            navigate("/");
        }
        catch {
            toast({ title: t("common:error"), variant: "destructive" });
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: t("format") }), _jsxs(Select, { value: format, onValueChange: (v) => setFormat(v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: FORMATS.map((f) => (_jsx(SelectItem, { value: f, children: t(f) }, f))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "q_starts_at", children: t("date_time") }), _jsx(Input, { id: "q_starts_at", type: "datetime-local", value: startsAt, onChange: (e) => setStartsAt(e.target.value), required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "q_city", children: t("city") }), _jsx(Input, { id: "q_city", value: city, onChange: (e) => setCity(e.target.value), required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "q_min_players", children: t("min_players") }), _jsx(Input, { id: "q_min_players", type: "number", min: 2, value: minPlayers, onChange: (e) => setMinPlayers(Number(e.target.value)) })] }), _jsx(Button, { type: "submit", className: "w-full min-h-[44px]", disabled: isCreating, children: isCreating ? t("common:loading") : t("create_quick_meetup") })] }));
}
