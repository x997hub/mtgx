import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users, Clock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { WhatsAppShareButton } from "@/components/shared/WhatsAppShareButton";
import { RSVPButton } from "@/components/events/RSVPButton";
import { AttendeeList } from "@/components/events/AttendeeList";
import { useEvent, useEventRsvps } from "@/hooks/useEvents";
import { useAuthStore } from "@/store/authStore";
export default function EventDetailPage() {
    const { t } = useTranslation(["events", "common"]);
    const { id: eventId } = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const { data: event, isLoading: eventLoading } = useEvent(eventId ?? "");
    const { data: rsvps, isLoading: rsvpsLoading } = useEventRsvps(eventId ?? "");
    const currentUserRsvp = useMemo(() => {
        if (!rsvps || !user)
            return null;
        const found = rsvps.find((r) => r.user_id === user.id);
        return found?.status ?? null;
    }, [rsvps, user]);
    const countdown = useMemo(() => {
        if (!event)
            return null;
        const now = new Date();
        const start = new Date(event.starts_at);
        const diff = start.getTime() - now.getTime();
        if (diff <= 0)
            return null;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return { days, hours, minutes };
    }, [event]);
    const isOrganizer = event && user && event.organizer_id === user.id;
    if (eventLoading) {
        return (_jsxs("div", { className: "space-y-4", children: [_jsx(Skeleton, { className: "h-8 w-3/4 rounded-lg" }), _jsx(Skeleton, { className: "h-48 rounded-lg" }), _jsx(Skeleton, { className: "h-32 rounded-lg" })] }));
    }
    if (!event) {
        return (_jsx("div", { className: "text-center py-12 text-text-secondary", children: t("common:no_results") }));
    }
    const date = new Date(event.starts_at);
    const dateStr = date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    const timeStr = date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    });
    const eventUrl = window.location.href;
    const eventTitle = event.title || t(event.type === "big" ? "events:big_event" : "events:quick_meetup");
    const goingCount = rsvps?.filter((r) => r.status === "going").length ?? 0;
    const spotsLeft = event.max_players ? event.max_players - goingCount : null;
    return (_jsxs("div", { className: "space-y-4 pb-8", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(FormatBadge, { format: event.format }), event.status === "cancelled" && (_jsx(Badge, { variant: "destructive", children: t("events:event_cancelled") })), event.status === "confirmed" && (_jsx(Badge, { className: "bg-emerald-700 text-emerald-100 border-none", children: t("events:event_confirmed") }))] }), _jsx("h1", { className: "text-2xl font-bold text-text-primary", children: eventTitle })] }), countdown && (_jsx(Card, { className: "bg-surface-card border-surface-hover", children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm text-text-secondary mb-2", children: [_jsx(Clock, { className: "h-4 w-4" }), t("events:starts_in")] }), _jsxs("div", { className: "flex gap-4 text-center", children: [countdown.days > 0 && (_jsxs("div", { children: [_jsx("div", { className: "text-2xl font-bold text-accent", children: countdown.days }), _jsx("div", { className: "text-xs text-text-secondary", children: t("events:days") })] })), _jsxs("div", { children: [_jsx("div", { className: "text-2xl font-bold text-accent", children: countdown.hours }), _jsx("div", { className: "text-xs text-text-secondary", children: t("events:hours") })] }), _jsxs("div", { children: [_jsx("div", { className: "text-2xl font-bold text-accent", children: countdown.minutes }), _jsx("div", { className: "text-xs text-text-secondary", children: t("events:minutes") })] })] })] }) })), _jsx(Card, { className: "bg-surface-card border-surface-hover", children: _jsxs(CardContent, { className: "p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-3 text-text-secondary", children: [_jsx(Calendar, { className: "h-4 w-4 flex-shrink-0" }), _jsxs("span", { className: "text-sm", children: [dateStr, " ", timeStr] })] }), event.venues && (_jsxs("div", { className: "flex items-center gap-3 text-text-secondary", children: [_jsx(MapPin, { className: "h-4 w-4 flex-shrink-0" }), _jsxs("div", { className: "text-sm", children: [_jsx("div", { className: "text-text-primary", children: event.venues.name }), _jsx("div", { children: event.venues.address })] })] })), _jsxs("div", { className: "flex items-center gap-3 text-text-secondary", children: [_jsx(Users, { className: "h-4 w-4 flex-shrink-0" }), _jsxs("span", { className: "text-sm", children: [event.min_players, event.max_players ? `–${event.max_players}` : "+", " ", t("events:min_players").toLowerCase(), spotsLeft !== null && spotsLeft > 0 && (_jsxs("span", { className: "text-accent ml-2", children: ["(", t("events:spots_left", { count: spotsLeft }), ")"] })), spotsLeft !== null && spotsLeft <= 0 && (_jsxs("span", { className: "text-red-400 ml-2", children: ["(", t("events:event_full"), ")"] }))] })] }), event.fee_text && (_jsxs("div", { className: "text-sm text-text-secondary", children: [_jsxs("span", { className: "font-medium text-text-primary", children: [t("events:fee"), ":"] }), " ", event.fee_text] })), event.description && (_jsxs(_Fragment, { children: [_jsx(Separator, { className: "bg-surface-hover" }), _jsx("div", { className: "text-sm text-text-secondary whitespace-pre-wrap", children: event.description })] })), event.profiles && (_jsx("div", { className: "text-xs text-text-secondary", children: t("events:organized_by", { name: event.profiles.display_name }) }))] }) }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [event.status === "active" && (_jsx(RSVPButton, { eventId: event.id, currentStatus: currentUserRsvp })), _jsx(WhatsAppShareButton, { eventTitle: eventTitle, eventUrl: eventUrl }), isOrganizer && (_jsxs(Button, { variant: "outline", size: "sm", className: "gap-2", onClick: () => navigate("/events/new", {
                            state: { cloneFrom: event },
                        }), children: [_jsx(Copy, { className: "h-4 w-4" }), t("events:clone_event")] }))] }), rsvpsLoading ? (_jsx(Skeleton, { className: "h-24 rounded-lg" })) : rsvps && rsvps.length > 0 ? (_jsx(Card, { className: "bg-surface-card border-surface-hover", children: _jsx(CardContent, { className: "p-4", children: _jsx(AttendeeList, { attendees: rsvps }) }) })) : null] }));
}
