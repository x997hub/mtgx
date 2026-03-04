import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { FAB } from "@/components/shared/FAB";
import { useEvents } from "@/hooks/useEvents";
import { useFilterStore } from "@/store/filterStore";
import { FORMATS, CITIES } from "@/lib/constants";
export default function EventFeedPage() {
    const { t } = useTranslation(["events", "common"]);
    const navigate = useNavigate();
    const { format, city, setFormat, setCity } = useFilterStore();
    const { events, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useEvents();
    const observerRef = useRef(null);
    const sentinelRef = useCallback((node) => {
        if (observerRef.current)
            observerRef.current.disconnect();
        if (!node || !hasNextPage)
            return;
        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        });
        observerRef.current.observe(node);
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
    useEffect(() => {
        return () => {
            if (observerRef.current)
                observerRef.current.disconnect();
        };
    }, []);
    return (_jsxs("div", { className: "space-y-4 pb-24", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs(Select, { value: format ?? "all", onValueChange: (v) => setFormat(v === "all" ? null : v), children: [_jsx(SelectTrigger, { className: "w-[140px] min-h-[44px]", children: _jsx(SelectValue, { placeholder: t("events:all_formats") }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: t("events:all_formats") }), FORMATS.map((f) => (_jsx(SelectItem, { value: f, children: t(`events:${f}`) }, f)))] })] }), _jsxs(Select, { value: city ?? "all", onValueChange: (v) => setCity(v === "all" ? null : v), children: [_jsx(SelectTrigger, { className: "w-[140px] min-h-[44px]", children: _jsx(SelectValue, { placeholder: t("events:all_cities") }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: t("events:all_cities") }), CITIES.map((c) => (_jsx(SelectItem, { value: c, children: c }, c)))] })] }), (format || city) && (_jsx(Badge, { variant: "outline", className: "cursor-pointer min-h-[44px] flex items-center border-surface-hover text-text-secondary hover:bg-surface-hover", onClick: () => {
                            setFormat(null);
                            setCity(null);
                        }, children: t("events:browse_all") }))] }), isLoading ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: Array.from({ length: 6 }).map((_, i) => (_jsx(Skeleton, { className: "h-32 rounded-lg" }, i))) })) : events.length === 0 ? (_jsx(EmptyState, { icon: Search, title: t("events:no_events"), description: t("events:no_events_description") })) : (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: [events.map((event) => (_jsx(EventCard, { event: event }, event.id))), _jsx("div", { ref: sentinelRef, className: "h-1" })] })), isFetchingNextPage && (_jsx("div", { className: "flex justify-center py-4", children: _jsx(Skeleton, { className: "h-8 w-32 rounded-lg" }) })), _jsxs(FAB, { onClick: () => navigate("/events/create"), children: [_jsx(CalendarPlus, { className: "h-5 w-5 mr-2" }), t("common:create")] })] }));
}
