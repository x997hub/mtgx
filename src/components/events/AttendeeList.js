import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
const STATUS_COLORS = {
    going: "bg-emerald-700",
    maybe: "bg-amber-700",
    not_going: "bg-gray-600",
};
const STATUS_ORDER = ["going", "maybe", "not_going"];
export function AttendeeList({ attendees }) {
    const { t } = useTranslation("events");
    const grouped = useMemo(() => {
        const groups = {
            going: [],
            maybe: [],
            not_going: [],
        };
        for (const a of attendees) {
            groups[a.status]?.push(a);
        }
        return groups;
    }, [attendees]);
    const goingCount = grouped.going.length;
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("h3", { className: "text-sm font-medium text-gray-300", children: [t("attendees"), " (", goingCount, ")"] }), STATUS_ORDER.map((status) => {
                const group = grouped[status];
                if (group.length === 0)
                    return null;
                return (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "text-xs font-medium text-text-secondary uppercase tracking-wide", children: [t(status), " (", group.length, ")"] }), _jsx("ul", { className: "space-y-1", children: group.map((attendee) => (_jsxs("li", { className: "flex items-center gap-3 rounded-lg px-2 py-1.5", children: [_jsx(Avatar, { className: "h-8 w-8", children: _jsx(AvatarFallback, { className: "text-xs", children: attendee.profiles?.display_name?.charAt(0)?.toUpperCase() || "?" }) }), _jsx("span", { className: "flex-1 text-sm text-gray-200", children: attendee.profiles?.display_name || "Unknown" }), _jsx(Badge, { className: `border-none text-white ${STATUS_COLORS[attendee.status]}`, children: t(attendee.status) })] }, attendee.user_id))) })] }, status));
            })] }));
}
