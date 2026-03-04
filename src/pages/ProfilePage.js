import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { CityBadge } from "@/components/shared/CityBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { DAYS, SLOTS } from "@/lib/constants";
import { Pencil, Shield, Bell } from "lucide-react";
const LEVEL_COLORS = {
    available: "bg-emerald-600",
    sometimes: "bg-amber-600",
    unavailable: "bg-gray-700",
};
function AvailabilityGrid({ availability }) {
    const { t } = useTranslation("profile");
    function getLevel(day, slot) {
        const entry = availability.find((a) => a.day === day && a.slot === slot);
        return entry?.level ?? "unavailable";
    }
    return (_jsxs("div", { className: "overflow-x-auto", children: [_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "p-1 text-left text-gray-400" }), DAYS.map((day) => (_jsx("th", { className: "p-1 text-center text-gray-400 font-normal", children: t(day) }, day)))] }) }), _jsx("tbody", { children: SLOTS.map((slot) => (_jsxs("tr", { children: [_jsx("td", { className: "p-1 text-gray-400 whitespace-nowrap", children: t(slot === "day" ? "day_slot" : "evening_slot") }), DAYS.map((day) => {
                                    const level = getLevel(day, slot);
                                    return (_jsx("td", { className: "p-1 text-center", children: _jsx("div", { className: `mx-auto h-6 w-6 rounded ${LEVEL_COLORS[level]}`, title: t(level) }) }, day));
                                })] }, slot))) })] }), _jsxs("div", { className: "mt-2 flex items-center gap-3 text-xs text-gray-400", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "inline-block h-3 w-3 rounded bg-emerald-600" }), " ", t("available")] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "inline-block h-3 w-3 rounded bg-amber-600" }), " ", t("sometimes")] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "inline-block h-3 w-3 rounded bg-gray-700" }), " ", t("unavailable")] })] })] }));
}
const ROLE_LABELS = {
    player: "role_player",
    organizer: "role_organizer",
    club_owner: "role_club_owner",
    admin: "role_admin",
};
const RELIABILITY_VIEWER_ROLES = ["organizer", "club_owner", "admin"];
export default function ProfilePage() {
    const { t } = useTranslation("profile");
    const { t: tc } = useTranslation("common");
    const { userId } = useParams();
    const { user, profile: viewerProfile } = useAuth();
    const isOwn = !userId || userId === user?.id;
    const { profile, availability, isLoading } = useProfile(isOwn ? undefined : userId);
    const { subscriptions } = useSubscription();
    // Reliability score is visible to organizers, club_owners, and admins
    const canSeeReliability = viewerProfile != null &&
        RELIABILITY_VIEWER_ROLES.includes(viewerProfile.role);
    if (isLoading) {
        return (_jsxs("div", { className: "min-h-screen bg-surface p-4 space-y-4", children: [_jsx(Skeleton, { className: "h-24 w-full rounded-xl" }), _jsx(Skeleton, { className: "h-40 w-full rounded-xl" }), _jsx(Skeleton, { className: "h-32 w-full rounded-xl" })] }));
    }
    if (!profile) {
        return (_jsx("div", { className: "min-h-screen bg-surface p-4", children: _jsx(EmptyState, { title: tc("no_results") }) }));
    }
    const initials = profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    return (_jsx("div", { className: "min-h-screen bg-surface text-text-primary", children: _jsxs("div", { className: "mx-auto max-w-lg space-y-4 p-4", children: [_jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Avatar, { className: "h-16 w-16", children: _jsx(AvatarFallback, { className: "text-lg", children: initials }) }), _jsxs("div", { className: "flex-1 space-y-1", children: [_jsx("h1", { className: "text-xl font-bold text-gray-100", children: profile.display_name }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(CityBadge, { city: profile.city }), _jsx(Badge, { variant: "outline", className: "text-gray-300", children: t(ROLE_LABELS[profile.role] ?? "role_player") })] })] }), isOwn && (_jsx(Button, { variant: "ghost", size: "icon", asChild: true, children: _jsx(Link, { to: "/profile/edit", children: _jsx(Pencil, { className: "h-4 w-4" }) }) }))] }) }) }), canSeeReliability && (_jsx(Card, { children: _jsxs(CardContent, { className: "flex items-center gap-3 p-4", children: [_jsx(Shield, { className: "h-5 w-5 text-accent" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-400", children: t("reliability_score") }), _jsxs("p", { className: "text-lg font-semibold text-gray-100", children: [((profile.reliability_score ?? 1) * 100).toFixed(0), "%"] })] })] }) })), profile.formats.length > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm text-gray-400", children: t("formats") }) }), _jsx(CardContent, { children: _jsx("div", { className: "flex flex-wrap gap-2", children: profile.formats.map((format) => (_jsx(FormatBadge, { format: format }, format))) }) })] })), _jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm text-gray-400", children: t("availability") }) }), _jsx(CardContent, { children: _jsx(AvailabilityGrid, { availability: availability }) })] }), isOwn && (_jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsxs(CardTitle, { className: "flex items-center gap-2 text-sm text-gray-400", children: [_jsx(Bell, { className: "h-4 w-4" }), t("subscriptions")] }) }), _jsx(CardContent, { children: subscriptions.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500", children: t("no_subscriptions") })) : (_jsx("div", { className: "space-y-2", children: subscriptions.map((sub) => (_jsx("div", { className: "flex items-center justify-between rounded-lg bg-[#1a1a2e] px-3 py-2 text-sm", children: _jsxs("span", { className: "text-gray-200", children: [sub.target_type, sub.format && ` / ${sub.format}`, sub.city && ` / ${sub.city}`] }) }, sub.id))) })) })] })), isOwn && (_jsx(Button, { className: "w-full", asChild: true, children: _jsxs(Link, { to: "/profile/edit", children: [_jsx(Pencil, { className: "mr-2 h-4 w-4" }), t("edit_profile")] }) }))] }) }));
}
