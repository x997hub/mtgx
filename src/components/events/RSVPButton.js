import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { RSVPDialog } from "@/components/events/RSVPDialog";
export function RSVPButton({ eventId, currentStatus }) {
    const { t } = useTranslation("events");
    const [open, setOpen] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsx(Button, { onClick: () => setOpen(true), variant: currentStatus === "going" ? "secondary" : "default", className: "min-h-[44px] min-w-[44px]", children: currentStatus ? t("rsvp_change") : t("rsvp") }), _jsx(RSVPDialog, { open: open, onOpenChange: setOpen, eventId: eventId, currentStatus: currentStatus })] }));
}
