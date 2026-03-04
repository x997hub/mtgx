import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
const STATUS_COLORS = {
    going: "bg-emerald-700",
    maybe: "bg-amber-700",
    not_going: "bg-gray-600",
};
export function AttendeeList({ attendees }) {
    const { t } = useTranslation("events");
    const sorted = [...attendees].sort((a, b) => {
        const order = { going: 0, maybe: 1, not_going: 2 };
        return order[a.status] - order[b.status];
    });
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("h3", { className: "text-sm font-medium text-gray-300", children: [t("attendees"), " (", attendees.filter((a) => a.status === "going").length, ")"] }), _jsx("div", { className: "space-y-1", children: sorted.map((attendee) => (_jsxs("div", { className: "flex items-center gap-3 rounded-lg px-2 py-1.5", children: [_jsx(Avatar, { className: "h-8 w-8", children: _jsx(AvatarFallback, { className: "text-xs", children: attendee.profiles?.display_name?.charAt(0)?.toUpperCase() || "?" }) }), _jsx("span", { className: "flex-1 text-sm text-gray-200", children: attendee.profiles?.display_name || "Unknown" }), _jsx(Badge, { className: `border-none text-white ${STATUS_COLORS[attendee.status]}`, children: t(attendee.status) })] }, attendee.user_id))) })] }));
}
