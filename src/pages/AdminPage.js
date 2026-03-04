import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { Users, Calendar, BarChart3, ShieldAlert } from "lucide-react";
const ROLES = ["player", "organizer", "club_owner", "admin"];
const STATUS_COLORS = {
    active: "bg-emerald-700 text-emerald-100",
    confirmed: "bg-blue-700 text-blue-100",
    cancelled: "bg-red-700 text-red-100",
    expired: "bg-gray-700 text-gray-300",
};
export default function AdminPage() {
    const { t } = useTranslation(["common", "events"]);
    const { profile } = useAuth();
    if (profile?.role !== "admin") {
        return (_jsx("div", { className: "flex min-h-[50vh] items-center justify-center", children: _jsx(Card, { className: "bg-surface-card border-surface-hover max-w-sm", children: _jsxs(CardContent, { className: "flex flex-col items-center gap-4 p-8", children: [_jsx(ShieldAlert, { className: "h-12 w-12 text-accent" }), _jsx("p", { className: "text-lg font-semibold text-text-primary", children: t("common:access_denied") }), _jsx("p", { className: "text-sm text-text-secondary", children: t("common:admin_required") })] }) }) }));
    }
    return (_jsxs("div", { className: "mx-auto max-w-4xl space-y-6 p-4", children: [_jsx("h1", { className: "text-2xl font-bold text-text-primary", children: t("common:admin") }), _jsxs(Tabs, { defaultValue: "report", children: [_jsxs(TabsList, { className: "bg-surface-card", children: [_jsxs(TabsTrigger, { value: "report", children: [_jsx(BarChart3, { className: "mr-1 h-4 w-4" }), t("common:report", "Report")] }), _jsxs(TabsTrigger, { value: "users", children: [_jsx(Users, { className: "mr-1 h-4 w-4" }), t("common:users", "Users")] }), _jsxs(TabsTrigger, { value: "events", children: [_jsx(Calendar, { className: "mr-1 h-4 w-4" }), t("common:events")] })] }), _jsx(TabsContent, { value: "report", children: _jsx(ReportTab, {}) }), _jsx(TabsContent, { value: "users", children: _jsx(UsersTab, {}) }), _jsx(TabsContent, { value: "events", children: _jsx(EventsTab, {}) })] })] }));
}
function ReportTab() {
    const { t } = useTranslation(["common", "events"]);
    const { data: report, isLoading, isError } = useQuery({
        queryKey: ["admin-report"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("admin_reports")
                .select("*")
                .order("report_date", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error)
                throw error;
            return data;
        },
    });
    if (isLoading) {
        return (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4", children: Array.from({ length: 6 }).map((_, i) => (_jsx(Skeleton, { className: "h-24 rounded-lg" }, i))) }));
    }
    if (isError) {
        return _jsx("p", { className: "p-4 text-red-400", children: t("common:error_occurred") });
    }
    if (!report) {
        return _jsx("p", { className: "p-4 text-text-secondary", children: t("common:no_reports") });
    }
    const payload = report.payload;
    return (_jsxs("div", { className: "space-y-4 mt-4", children: [_jsx("p", { className: "text-xs text-text-secondary", children: t("common:report_date", { date: new Date(report.report_date).toLocaleDateString() }) }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: [_jsx(MetricCard, { label: t("common:new_users", "New users"), value: payload.new_users }), _jsx(MetricCard, { label: t("common:events_created", "Events created"), value: `${payload.events_created?.big ?? 0} big / ${payload.events_created?.quick ?? 0} quick` }), _jsx(MetricCard, { label: t("events:rsvp", "RSVPs"), value: `${payload.rsvps_today?.going ?? 0} / ${payload.rsvps_today?.maybe ?? 0} / ${payload.rsvps_today?.not_going ?? 0}`, subtitle: `${t("events:going")} / ${t("events:maybe")} / ${t("events:not_going")}` }), _jsx(MetricCard, { label: t("common:lfg_signals", "LFG signals"), value: payload.lfg_signals }), _jsx(MetricCard, { label: t("common:active_lfg", "Active LFG now"), value: payload.active_lfg_now }), payload.cancellations && (_jsx(MetricCard, { label: t("common:cancellations", "Cancellations"), value: `${payload.cancellations.total} (${payload.cancellations.late_24h} late)` }))] }), payload.low_reliability_users && payload.low_reliability_users.length > 0 && (_jsxs(Card, { className: "bg-surface-card border-surface-hover", children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm text-red-400", children: t("common:low_reliability", "Low reliability players") }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-2", children: payload.low_reliability_users.map((u) => (_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-text-primary", children: u.display_name }), _jsxs(Badge, { className: "bg-red-700/20 text-red-400 border-none", children: [(u.score * 100).toFixed(0), "%"] })] }, u.user_id))) }) })] }))] }));
}
function MetricCard({ label, value, subtitle }) {
    return (_jsxs(Card, { className: "bg-surface-card border-surface-hover", children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm text-text-secondary", children: label }) }), _jsxs(CardContent, { children: [_jsx("p", { className: "text-2xl font-bold text-accent", children: value }), subtitle && _jsx("p", { className: "text-xs text-text-secondary mt-1", children: subtitle })] })] }));
}
function UsersTab() {
    const { t } = useTranslation(["common", "events"]);
    const queryClient = useQueryClient();
    const { data: profiles, isLoading, isError } = useQuery({
        queryKey: ["admin-profiles"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            return data;
        },
    });
    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, role }) => {
            const { error } = await supabase
                .from("profiles")
                .update({ role })
                .eq("id", userId);
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
        },
    });
    if (isLoading) {
        return (_jsx("div", { className: "space-y-2 mt-4", children: Array.from({ length: 5 }).map((_, i) => (_jsx(Skeleton, { className: "h-14 w-full rounded-lg" }, i))) }));
    }
    if (isError) {
        return _jsx("p", { className: "p-4 text-red-400", children: t("common:error_occurred") });
    }
    return (_jsx("div", { className: "space-y-2 mt-4", children: profiles?.map((user) => (_jsx(Card, { className: "bg-surface-card border-surface-hover", children: _jsxs(CardContent, { className: "flex items-center justify-between p-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-text-primary", children: user.display_name }), _jsxs("div", { className: "flex items-center gap-2 text-sm text-text-secondary", children: [_jsx("span", { children: user.city }), user.reliability_score != null && user.reliability_score < 1 && (_jsxs(Badge, { className: `border-none text-xs ${user.reliability_score < 0.5
                                            ? "bg-red-700/20 text-red-400"
                                            : "bg-amber-700/20 text-amber-400"}`, children: [t("profile:reliability_score", "Reliability"), ": ", (user.reliability_score * 100).toFixed(0), "%"] }))] })] }), _jsxs(Select, { value: user.role, onValueChange: (role) => updateRoleMutation.mutate({ userId: user.id, role: role }), children: [_jsx(SelectTrigger, { className: "w-[130px]", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: ROLES.map((role) => (_jsx(SelectItem, { value: role, children: role }, role))) })] })] }) }, user.id))) }));
}
function EventsTab() {
    const { t } = useTranslation(["common", "events"]);
    const { data: events, isLoading, isError } = useQuery({
        queryKey: ["admin-events"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("events")
                .select("*, profiles!events_organizer_id_fkey(display_name)")
                .order("starts_at", { ascending: false })
                .limit(50);
            if (error)
                throw error;
            return data;
        },
    });
    if (isLoading) {
        return (_jsx("div", { className: "space-y-2 mt-4", children: Array.from({ length: 5 }).map((_, i) => (_jsx(Skeleton, { className: "h-16 w-full rounded-lg" }, i))) }));
    }
    if (isError) {
        return _jsx("p", { className: "p-4 text-red-400", children: t("common:error_occurred") });
    }
    return (_jsx("div", { className: "space-y-2 mt-4", children: events?.map((evt) => {
            const title = evt.title || `Quick ${evt.format}`;
            const organizer = evt.profiles?.display_name;
            return (_jsx(Card, { className: "bg-surface-card border-surface-hover", children: _jsxs(CardContent, { className: "flex items-center justify-between p-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(FormatBadge, { format: evt.format }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-text-primary", children: title }), _jsxs("p", { className: "text-sm text-text-secondary", children: [new Date(evt.starts_at).toLocaleDateString(), " \u2014 ", evt.city, organizer && _jsxs(_Fragment, { children: [" \u2014 ", organizer] })] })] })] }), _jsx(Badge, { className: `border-none ${STATUS_COLORS[evt.status] ?? "bg-gray-700 text-gray-300"}`, children: evt.status })] }) }, evt.id));
        }) }));
}
