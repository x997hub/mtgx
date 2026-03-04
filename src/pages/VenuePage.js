import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { CityBadge } from "@/components/shared/CityBadge";
import { SubscribeButton } from "@/components/shared/SubscribeButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { EventCard } from "@/components/events/EventCard";
import { MapPin, Clock, Users, Phone, Calendar } from "lucide-react";
const VENUE_IMAGES_BUCKET = "venue-images";
export default function VenuePage() {
    const { t } = useTranslation("venue");
    const { t: tc } = useTranslation("common");
    const { id: venueId } = useParams();
    const venueQuery = useQuery({
        queryKey: ["venue", venueId],
        queryFn: async () => {
            if (!venueId)
                return null;
            const { data, error } = await supabase
                .from("venues")
                .select("*")
                .eq("id", venueId)
                .single();
            if (error)
                throw error;
            return data;
        },
        enabled: !!venueId,
    });
    const eventsQuery = useQuery({
        queryKey: ["venue-events", venueId],
        queryFn: async () => {
            if (!venueId)
                return [];
            const { data, error } = await supabase
                .from("events")
                .select("*, venues(name, city), profiles!events_organizer_id_fkey(display_name)")
                .eq("venue_id", venueId)
                .eq("status", "active")
                .gte("starts_at", new Date().toISOString())
                .order("starts_at", { ascending: true })
                .limit(20);
            if (error)
                throw error;
            return data;
        },
        enabled: !!venueId,
    });
    const photosQuery = useQuery({
        queryKey: ["venue-photos", venueId],
        queryFn: async () => {
            if (!venueId)
                return [];
            const { data, error } = await supabase
                .from("venue_photos")
                .select("*")
                .eq("venue_id", venueId)
                .order("is_primary", { ascending: false });
            if (error)
                throw error;
            return data;
        },
        enabled: !!venueId,
    });
    const primaryPhoto = photosQuery.data?.find((p) => p.is_primary) ?? photosQuery.data?.[0];
    const primaryPhotoUrl = primaryPhoto
        ? supabase.storage.from(VENUE_IMAGES_BUCKET).getPublicUrl(primaryPhoto.storage_path).data.publicUrl
        : null;
    if (venueQuery.isLoading) {
        return (_jsxs("div", { className: "min-h-screen bg-surface p-4 space-y-4", children: [_jsx(Skeleton, { className: "h-24 w-full rounded-xl" }), _jsx(Skeleton, { className: "h-48 w-full rounded-xl" }), _jsx(Skeleton, { className: "h-32 w-full rounded-xl" })] }));
    }
    if (venueQuery.isError) {
        return (_jsx("div", { className: "min-h-screen bg-surface p-4", children: _jsx(EmptyState, { title: tc("error_occurred") }) }));
    }
    const venue = venueQuery.data;
    if (!venue) {
        return (_jsx("div", { className: "min-h-screen bg-surface p-4", children: _jsx(EmptyState, { title: tc("no_results") }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-surface text-text-primary", children: _jsxs("div", { className: "mx-auto max-w-lg space-y-4 p-4", children: [primaryPhotoUrl && (_jsx("div", { className: "aspect-video w-full overflow-hidden rounded-xl bg-[#16213e]", children: _jsx("img", { src: primaryPhotoUrl, alt: venue.name, className: "h-full w-full object-cover" }) })), _jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h1", { className: "text-xl font-bold text-gray-100", children: venue.name }), _jsx(CityBadge, { city: venue.city })] }), _jsx(SubscribeButton, { targetType: "venue", targetId: venue.id })] }) }) }), _jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm text-gray-400", children: t("venue_info") }) }), _jsxs(CardContent, { className: "space-y-3", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx(MapPin, { className: "mt-0.5 h-4 w-4 shrink-0 text-gray-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: t("address") }), _jsx("p", { className: "text-sm text-gray-200", children: venue.address })] })] }), venue.hours && Object.keys(venue.hours).length > 0 && (_jsxs(_Fragment, { children: [_jsx(Separator, {}), _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(Clock, { className: "mt-0.5 h-4 w-4 shrink-0 text-gray-400" }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-xs text-gray-500", children: t("hours") }), _jsx("div", { className: "space-y-1", children: Object.entries(venue.hours).map(([day, time]) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-400", children: day }), _jsx("span", { className: "text-gray-200", children: time })] }, day))) })] })] })] })), venue.capacity != null && (_jsxs(_Fragment, { children: [_jsx(Separator, {}), _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(Users, { className: "mt-0.5 h-4 w-4 shrink-0 text-gray-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: t("capacity") }), _jsx("p", { className: "text-sm text-gray-200", children: t("players_capacity", { count: venue.capacity }) })] })] })] })), venue.contacts && Object.keys(venue.contacts).length > 0 && (_jsxs(_Fragment, { children: [_jsx(Separator, {}), _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(Phone, { className: "mt-0.5 h-4 w-4 shrink-0 text-gray-400" }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-xs text-gray-500", children: t("contacts") }), _jsx("div", { className: "space-y-1", children: Object.entries(venue.contacts).map(([label, value]) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-400", children: label }), _jsx("span", { className: "text-gray-200", children: value })] }, label))) })] })] })] })), venue.supported_formats.length > 0 && (_jsxs(_Fragment, { children: [_jsx(Separator, {}), _jsxs("div", { children: [_jsx("p", { className: "mb-2 text-xs text-gray-500", children: t("supported_formats") }), _jsx("div", { className: "flex flex-wrap gap-2", children: venue.supported_formats.map((format) => (_jsx(FormatBadge, { format: format }, format))) })] })] }))] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsxs(CardTitle, { className: "flex items-center gap-2 text-sm text-gray-400", children: [_jsx(Calendar, { className: "h-4 w-4" }), t("upcoming_events")] }) }), _jsx(CardContent, { children: eventsQuery.isLoading ? (_jsxs("div", { className: "space-y-3", children: [_jsx(Skeleton, { className: "h-20 w-full rounded-lg" }), _jsx(Skeleton, { className: "h-20 w-full rounded-lg" })] })) : eventsQuery.data && eventsQuery.data.length > 0 ? (_jsx("div", { className: "space-y-3", children: eventsQuery.data.map((event) => (_jsx(EventCard, { event: event }, event.id))) })) : (_jsx("p", { className: "py-4 text-center text-sm text-gray-500", children: t("no_upcoming_events") })) })] })] }) }));
}
