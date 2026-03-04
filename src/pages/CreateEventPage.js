import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FormLayout } from "@/components/layout/FormLayout";
import { EventTypeToggle } from "@/components/events/EventTypeToggle";
import { BigEventForm } from "@/components/events/BigEventForm";
import { QuickMeetupForm } from "@/components/events/QuickMeetupForm";
export default function CreateEventPage() {
    const { t } = useTranslation("events");
    const location = useLocation();
    const cloneFrom = location.state
        ?.cloneFrom;
    const [eventType, setEventType] = useState(cloneFrom?.type ?? "quick");
    return (_jsx(FormLayout, { children: _jsxs("div", { className: "space-y-6", children: [_jsx("h1", { className: "text-xl font-semibold text-text-primary", children: t("create_event") }), _jsx(EventTypeToggle, { value: eventType, onChange: setEventType }), eventType === "big" ? (_jsx(BigEventForm, { defaultValues: cloneFrom
                        ? {
                            title: cloneFrom.title,
                            format: cloneFrom.format,
                            venue_id: cloneFrom.venue_id,
                            min_players: cloneFrom.min_players,
                            max_players: cloneFrom.max_players,
                            fee_text: cloneFrom.fee_text,
                            description: cloneFrom.description,
                        }
                        : undefined })) : (_jsx(QuickMeetupForm, {}))] }) }));
}
