import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { CityBadge } from "@/components/shared/CityBadge";
export function EventCard({ event, rsvpCount }) {
    const { t } = useTranslation("events");
    const date = new Date(event.starts_at);
    const timeStr = date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
    const hourStr = date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    });
    return (_jsx(Link, { to: `/events/${event.id}`, children: _jsx(Card, { className: "transition-colors hover:border-[#e94560]/50", children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "flex-1 space-y-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(FormatBadge, { format: event.format }), _jsx(CityBadge, { city: event.city })] }), _jsx("h3", { className: "font-semibold text-gray-100", children: event.title || t(event.type === "big" ? "big_event" : "quick_meetup") }), _jsxs("div", { className: "flex flex-col gap-1 text-sm text-gray-400", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Calendar, { className: "h-3.5 w-3.5" }), timeStr, " ", hourStr] }), event.venues && (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(MapPin, { className: "h-3.5 w-3.5" }), event.venues.name] }))] })] }), _jsxs("div", { className: "flex flex-col items-center text-sm text-gray-400", children: [_jsx(Users, { className: "h-4 w-4" }), _jsx("span", { children: rsvpCount ?? 0 })] })] }) }) }) }));
}
