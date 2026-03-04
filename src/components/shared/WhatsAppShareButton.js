import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
export function WhatsAppShareButton({ eventTitle, eventUrl }) {
    const { t } = useTranslation("events");
    const shareText = encodeURIComponent(`${eventTitle}\n${eventUrl}`);
    const whatsappUrl = `https://wa.me/?text=${shareText}`;
    return (_jsx(Button, { variant: "outline", size: "sm", className: "gap-2", asChild: true, children: _jsxs("a", { href: whatsappUrl, target: "_blank", rel: "noopener noreferrer", children: [_jsx(MessageCircle, { className: "h-4 w-4" }), t("share_whatsapp")] }) }));
}
