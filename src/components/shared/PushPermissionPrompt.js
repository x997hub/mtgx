import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { usePush } from "@/hooks/usePush";
export function PushPermissionPrompt({ open, onOpenChange }) {
    const { t } = useTranslation();
    const { requestPermission } = usePush();
    const handleAllow = async () => {
        await requestPermission();
        onOpenChange(false);
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx("div", { className: "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e94560]/20", children: _jsx(Bell, { className: "h-6 w-6 text-[#e94560]" }) }), _jsx(DialogTitle, { className: "text-center", children: t("push_notifications") }), _jsx(DialogDescription, { className: "text-center", children: "Get notified when new events match your availability, when events fill up, and 24h reminders." })] }), _jsxs(DialogFooter, { className: "flex-col gap-2 sm:flex-col", children: [_jsx(Button, { onClick: handleAllow, className: "w-full", children: t("confirm") }), _jsx(Button, { variant: "ghost", onClick: () => onOpenChange(false), className: "w-full", children: t("skip") })] })] }) }));
}
