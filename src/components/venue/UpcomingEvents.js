import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Calendar } from "lucide-react";
export function UpcomingEvents({ venueId }) {
    const { t } = useTranslation("venue");
    const { data: events, isLoading } = useQuery({
        queryKey: ["venue-events", venueId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("events")
                .select("*")
                .eq("venue_id", venueId)
                .eq("status", "active")
                .gte("starts_at", new Date().toISOString())
                .order("starts_at", { ascending: true })
                .limit(10);
            if (error)
                throw error;
            return data;
        },
        enabled: !!venueId,
    });
    if (isLoading)
        return null;
    return (_jsxs("div", { className: "space-y-3", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-100", children: t("upcoming_events") }), events && events.length > 0 ? (_jsx("div", { className: "space-y-3", children: events.map((event) => (_jsx(EventCard, { event: event }, event.id))) })) : (_jsx(EmptyState, { icon: Calendar, title: t("no_upcoming_events") }))] }));
}
