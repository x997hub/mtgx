import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRSVP } from "@/hooks/useRSVP";
import { toast } from "@/components/ui/use-toast";
const OPTIONS = [
    { status: "going", variant: "default" },
    { status: "maybe", variant: "secondary" },
    { status: "not_going", variant: "outline" },
];
export function RSVPDialog({ open, onOpenChange, eventId, currentStatus }) {
    const { t } = useTranslation("events");
    const rsvpMutation = useRSVP();
    const handleRSVP = async (status) => {
        try {
            await rsvpMutation.mutateAsync({ eventId, status });
            onOpenChange(false);
        }
        catch {
            toast({ title: t("common:error"), variant: "destructive" });
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-sm", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: t("rsvp") }) }), _jsx("div", { className: "flex flex-col gap-3", children: OPTIONS.map(({ status, variant }) => (_jsx(Button, { variant: currentStatus === status ? "default" : variant, className: "min-h-[44px] w-full", onClick: () => handleRSVP(status), disabled: rsvpMutation.isPending, children: t(status) }, status))) })] }) }));
}
