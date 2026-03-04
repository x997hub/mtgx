import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { usePush } from "@/hooks/usePush";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Globe, Bell, BellOff, LogOut, Trash2, User, MapPin, Layers } from "lucide-react";
const TARGET_TYPE_ICONS = {
    organizer: User,
    venue: MapPin,
    format_city: Layers,
};
function getSubscriptionLabel(sub) {
    switch (sub.target_type) {
        case "format_city":
            return `${sub.format ?? "?"} — ${sub.city ?? "?"}`;
        case "organizer":
            return sub.target_id ? `ID: ${sub.target_id.slice(0, 8)}...` : "Unknown";
        case "venue":
            return sub.target_id ? `ID: ${sub.target_id.slice(0, 8)}...` : "Unknown";
        default:
            return String(sub.target_id ?? "");
    }
}
export default function SettingsPage() {
    const { t, i18n } = useTranslation(["common", "profile"]);
    const { logout } = useAuth();
    const { subscriptions, unsubscribe } = useSubscription();
    const { permission, requestPermission, isSupported } = usePush();
    const currentLang = i18n.language;
    return (_jsxs("div", { className: "mx-auto max-w-2xl space-y-6 p-4", children: [_jsx("h1", { className: "text-2xl font-bold text-text-primary", children: t("common:settings") }), _jsxs(Card, { className: "bg-surface-card border-surface-hover", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2 text-text-primary", children: [_jsx(Globe, { className: "h-5 w-5" }), t("profile:language")] }) }), _jsxs(CardContent, { className: "flex gap-2", children: [_jsx(Button, { variant: currentLang.startsWith("en") ? "default" : "outline", onClick: () => i18n.changeLanguage("en"), className: "min-h-[44px]", children: "EN" }), _jsx(Button, { variant: currentLang.startsWith("ru") ? "default" : "outline", onClick: () => i18n.changeLanguage("ru"), className: "min-h-[44px]", children: "RU" })] })] }), _jsxs(Card, { className: "bg-surface-card border-surface-hover", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2 text-text-primary", children: [_jsx(Bell, { className: "h-5 w-5" }), t("common:notifications")] }) }), _jsx(CardContent, { children: !isSupported ? (_jsx("p", { className: "text-sm text-text-secondary", children: t("profile:push_not_supported", "Push notifications not supported in this browser") })) : permission === "granted" ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Bell, { className: "h-4 w-4 text-emerald-400" }), _jsx("span", { className: "text-sm text-emerald-400", children: t("profile:push_enabled", "Push notifications enabled") })] })) : permission === "denied" ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(BellOff, { className: "h-4 w-4 text-red-400" }), _jsx("span", { className: "text-sm text-red-400", children: t("profile:push_denied", "Push notifications blocked by browser") })] })) : (_jsxs(Button, { variant: "outline", onClick: requestPermission, className: "min-h-[44px]", children: [_jsx(Bell, { className: "mr-2 h-4 w-4" }), t("profile:push_enable", "Enable Push Notifications")] })) })] }), _jsxs(Card, { className: "bg-surface-card border-surface-hover", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-text-primary", children: t("common:subscriptions", "Subscriptions") }) }), _jsx(CardContent, { children: subscriptions.length === 0 ? (_jsx("p", { className: "text-sm text-text-secondary", children: t("common:no_subscriptions", "No subscriptions yet") })) : (_jsx("ul", { className: "space-y-2", children: subscriptions.map((sub) => {
                                const Icon = TARGET_TYPE_ICONS[sub.target_type] ?? Bell;
                                return (_jsxs("li", { className: "flex items-center justify-between rounded-lg bg-surface p-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Icon, { className: "h-4 w-4 text-text-secondary" }), _jsx(Badge, { variant: "outline", children: sub.target_type }), _jsx("span", { className: "text-sm text-text-secondary", children: getSubscriptionLabel(sub) })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => unsubscribe(sub.id), className: "min-h-[44px] min-w-[44px] text-red-400 hover:text-red-300", children: _jsx(Trash2, { className: "h-4 w-4" }) })] }, sub.id));
                            }) })) })] }), _jsx(Separator, { className: "bg-surface-hover" }), _jsxs(Button, { variant: "destructive", onClick: logout, className: "w-full min-h-[44px]", children: [_jsx(LogOut, { className: "mr-2 h-4 w-4" }), t("common:logout")] })] }));
}
