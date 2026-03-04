import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";
export function OfflineBanner() {
    const { t } = useTranslation();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    useEffect(() => {
        const goOffline = () => setIsOffline(true);
        const goOnline = () => setIsOffline(false);
        window.addEventListener("offline", goOffline);
        window.addEventListener("online", goOnline);
        return () => {
            window.removeEventListener("offline", goOffline);
            window.removeEventListener("online", goOnline);
        };
    }, []);
    if (!isOffline)
        return null;
    return (_jsxs("div", { className: "flex items-center justify-center gap-2 bg-amber-800 px-4 py-2 text-sm text-amber-100", children: [_jsx(WifiOff, { className: "h-4 w-4" }), t("offline_message")] }));
}
