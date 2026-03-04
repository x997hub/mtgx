import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
export function SubscribeButton({ targetType, targetId, className }) {
    const { t } = useTranslation();
    const { subscriptions, subscribe, unsubscribe, isSubscribing } = useSubscription();
    const existing = subscriptions.find((s) => s.target_type === targetType && s.target_id === (targetId ?? null));
    const handleClick = () => {
        if (existing) {
            unsubscribe(existing.id);
        }
        else {
            subscribe({ targetType, targetId });
        }
    };
    return (_jsx(Button, { variant: existing ? "secondary" : "default", size: "sm", onClick: handleClick, disabled: isSubscribing, className: className, children: existing ? (_jsxs(_Fragment, { children: [_jsx(BellOff, { className: "mr-1 h-4 w-4" }), t("unsubscribe")] })) : (_jsxs(_Fragment, { children: [_jsx(Bell, { className: "mr-1 h-4 w-4" }), t("subscribe")] })) }));
}
