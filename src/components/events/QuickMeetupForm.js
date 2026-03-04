import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/hooks/useEvents";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/use-toast";
import { EventFormFields } from "@/components/events/EventFormFields";
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
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx(EventFormFields, { format: format, onFormatChange: setFormat, city: city, onCityChange: setCity, startsAt: startsAt, onStartsAtChange: setStartsAt, minPlayers: minPlayers, onMinPlayersChange: setMinPlayers, idPrefix: "q_" }), _jsx(Button, { type: "submit", className: "w-full min-h-[44px]", disabled: isCreating, children: isCreating ? t("common:loading") : t("create_quick_meetup") })] }));
}
