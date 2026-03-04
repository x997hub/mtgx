import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
function getTimeLeft(target) {
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    if (diff <= 0)
        return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return { days, hours, minutes };
}
export function EventCountdown({ startsAt }) {
    const { t } = useTranslation("events");
    const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(new Date(startsAt)));
    useEffect(() => {
        const target = new Date(startsAt);
        setTimeLeft(getTimeLeft(target));
        const interval = setInterval(() => {
            const remaining = getTimeLeft(target);
            setTimeLeft(remaining);
            if (!remaining)
                clearInterval(interval);
        }, 60000);
        return () => clearInterval(interval);
    }, [startsAt]);
    if (!timeLeft)
        return null;
    return (_jsxs("div", { role: "timer", "aria-live": "polite", className: "flex items-center gap-1 text-sm text-gray-400", children: [_jsx("span", { children: t("starts_in") }), timeLeft.days > 0 && (_jsxs("span", { className: "font-medium text-gray-200", children: [timeLeft.days, " ", t("days")] })), _jsxs("span", { className: "font-medium text-gray-200", children: [timeLeft.hours, " ", t("hours")] }), _jsxs("span", { className: "font-medium text-gray-200", children: [timeLeft.minutes, " ", t("minutes")] })] }));
}
