import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { useLFG } from "@/hooks/useLFG";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/use-toast";
import { FORMATS, CITIES } from "@/lib/constants";
export function LFGToggleButton() {
    const { t } = useTranslation("events");
    const profile = useAuthStore((s) => s.profile);
    const { mySignal, activate, deactivate, isActivating, isDeactivating } = useLFG(profile?.city);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState(profile?.formats?.[0] ?? "pauper");
    const [selectedCity, setSelectedCity] = useState(profile?.city ?? "");
    const handleActivate = () => {
        activate({ city: selectedCity, formats: [selectedFormat] }, {
            onSuccess: () => {
                setDialogOpen(false);
                toast({ title: t("lfg_active") });
            },
            onError: () => {
                toast({ title: t("common:error"), variant: "destructive" });
            },
        });
    };
    const handleDeactivate = () => {
        deactivate(undefined, {
            onSuccess: () => {
                toast({ title: t("common:success", "Signal removed") });
            },
        });
    };
    if (mySignal) {
        const expiresIn = Math.max(0, Math.round((new Date(mySignal.expires_at).getTime() - Date.now()) / (1000 * 60 * 60)));
        return (_jsxs(Button, { variant: "secondary", className: "gap-2 min-h-[44px]", onClick: handleDeactivate, disabled: isDeactivating, children: [_jsx(ZapOff, { className: "h-4 w-4" }), t("lfg_active"), " (", t("lfg_expires", { hours: expiresIn }), ")"] }));
    }
    return (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "outline", className: "gap-2 min-h-[44px] border-[#e94560]/40 text-[#e94560] hover:bg-[#e94560]/10", onClick: () => setDialogOpen(true), children: [_jsx(Zap, { className: "h-4 w-4" }), t("lfg_activate")] }), _jsx(Dialog, { open: dialogOpen, onOpenChange: setDialogOpen, children: _jsxs(DialogContent, { className: "sm:max-w-sm", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: t("lfg_activate") }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: t("format") }), _jsxs(Select, { value: selectedFormat, onValueChange: (v) => setSelectedFormat(v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: FORMATS.map((f) => (_jsx(SelectItem, { value: f, children: t(f) }, f))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: t("city") }), _jsxs(Select, { value: selectedCity, onValueChange: setSelectedCity, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: t("city") }) }), _jsx(SelectContent, { children: CITIES.map((c) => (_jsx(SelectItem, { value: c, children: c }, c))) })] })] }), _jsxs(Button, { className: "w-full min-h-[44px]", onClick: handleActivate, disabled: isActivating || !selectedCity, children: [_jsx(Zap, { className: "h-4 w-4 mr-2" }), isActivating ? t("common:loading") : t("lfg_activate")] })] })] }) })] }));
}
