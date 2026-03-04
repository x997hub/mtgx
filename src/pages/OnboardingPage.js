import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/components/ui/use-toast";
import { FORMATS, CITIES, DAYS, SLOTS } from "@/lib/constants";
export default function OnboardingPage() {
    const { t } = useTranslation(["profile", "common", "events"]);
    const navigate = useNavigate();
    const { user, profile: existingProfile } = useAuth();
    const { upsertProfile, updateAvailability, isUpdating } = useProfile();
    const { subscribe } = useSubscription();
    // If user already has a profile, redirect to feed
    if (existingProfile) {
        navigate("/", { replace: true });
    }
    const [step, setStep] = useState(0);
    const [city, setCity] = useState("");
    const [formats, setFormats] = useState([]);
    const [availability, setAvailability] = useState({});
    const toggleFormat = (format) => {
        setFormats((prev) => prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]);
    };
    const toggleAvailability = (day, slot) => {
        const key = `${day}-${slot}`;
        setAvailability((prev) => ({ ...prev, [key]: !prev[key] }));
    };
    const handleSaveProfile = async () => {
        if (!user)
            return;
        const displayName = user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Player";
        try {
            await upsertProfile({
                id: user.id,
                display_name: displayName,
                city,
                formats,
            });
            toast({ title: t("profile:profile_saved") });
        }
        catch {
            toast({ title: t("common:error"), variant: "destructive" });
        }
    };
    const handleSaveAvailability = async () => {
        if (!user)
            return;
        const slots = Object.entries(availability)
            .filter(([, active]) => active)
            .map(([key]) => {
            const [day, slot] = key.split("-");
            return { user_id: user.id, day, slot, level: "available" };
        });
        try {
            await updateAvailability(slots);
        }
        catch {
            toast({ title: t("common:error"), variant: "destructive" });
        }
    };
    const handleNext = async () => {
        if (step === 0 && city) {
            await handleSaveProfile();
            setStep(1);
        }
        else if (step === 1 && formats.length > 0) {
            await handleSaveProfile();
            setStep(2);
        }
        else if (step === 2) {
            await handleSaveAvailability();
            setStep(3);
        }
        else if (step === 3) {
            navigate("/");
        }
    };
    const handleSkipAvailability = async () => {
        setStep(3);
    };
    const handleSubscribeAndFinish = async () => {
        if (city && formats.length > 0) {
            for (const format of formats) {
                subscribe({
                    targetType: "format_city",
                    format,
                    city,
                });
            }
        }
        navigate("/");
    };
    const totalSteps = 4;
    const progress = ((step + 1) / totalSteps) * 100;
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-surface p-4", children: _jsxs(Card, { className: "w-full max-w-md bg-surface-card border-surface-hover", children: [_jsxs(CardHeader, { children: [_jsx("div", { className: "w-full bg-surface-hover rounded-full h-2 mb-4", children: _jsx("div", { className: "bg-accent h-2 rounded-full transition-all duration-300", style: { width: `${progress}%` } }) }), _jsxs(CardTitle, { className: "text-text-primary text-lg text-center", children: [step === 0 && t("profile:onboarding_city"), step === 1 && t("profile:onboarding_formats"), step === 2 && t("profile:onboarding_availability"), step === 3 && t("profile:onboarding_subscribe")] })] }), _jsxs(CardContent, { className: "space-y-6", children: [step === 0 && (_jsxs(Select, { value: city, onValueChange: setCity, children: [_jsx(SelectTrigger, { className: "min-h-[44px]", children: _jsx(SelectValue, { placeholder: t("profile:select_city") }) }), _jsx(SelectContent, { children: CITIES.map((c) => (_jsx(SelectItem, { value: c, children: c }, c))) })] })), step === 1 && (_jsx("div", { className: "flex flex-wrap gap-2", children: FORMATS.map((format) => (_jsx(Badge, { variant: formats.includes(format) ? "default" : "outline", className: `cursor-pointer px-4 py-2 text-sm min-h-[44px] flex items-center transition-colors ${formats.includes(format)
                                    ? "bg-accent text-white hover:bg-accent/80"
                                    : "border-surface-hover text-text-secondary hover:bg-surface-hover"}`, onClick: () => toggleFormat(format), children: t(`events:${format}`) }, format))) })), step === 2 && (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-text-secondary", children: t("profile:availability_description") }), _jsxs("div", { className: "grid grid-cols-[auto_1fr_1fr] gap-2 items-center", children: [_jsx("div", {}), SLOTS.map((slot) => (_jsx("div", { className: "text-center text-sm text-text-secondary font-medium", children: t(`profile:${slot}_slot`) }, slot))), DAYS.map((day) => (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-sm text-text-secondary font-medium pr-2", children: t(`profile:${day}`) }, `label-${day}`), SLOTS.map((slot) => {
                                                    const key = `${day}-${slot}`;
                                                    const isActive = !!availability[key];
                                                    return (_jsx("button", { type: "button", onClick: () => toggleAvailability(day, slot), className: `min-h-[44px] rounded-lg border transition-colors ${isActive
                                                            ? "bg-accent/20 border-accent text-accent"
                                                            : "bg-surface border-surface-hover text-text-secondary hover:bg-surface-hover"}`, children: isActive ? "+" : "-" }, key));
                                                })] })))] })] })), step === 3 && (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-text-secondary text-center", children: t("profile:onboarding_subscribe") }), city && formats.length > 0 && (_jsx("div", { className: "space-y-2", children: formats.map((format) => (_jsxs("div", { className: "flex items-center justify-between rounded-lg border border-surface-hover px-4 py-3", children: [_jsxs("span", { className: "text-text-primary text-sm", children: [t(`events:${format}`), " in ", city] }), _jsx(Badge, { variant: "outline", className: "text-accent border-accent", children: t("common:subscribe") })] }, format))) }))] })), _jsxs("div", { className: "flex gap-3", children: [step === 2 && (_jsx(Button, { variant: "outline", onClick: handleSkipAvailability, className: "flex-1 min-h-[44px] border-surface-hover text-text-secondary", children: t("common:skip") })), step < 3 ? (_jsx(Button, { onClick: handleNext, disabled: isUpdating ||
                                        (step === 0 && !city) ||
                                        (step === 1 && formats.length === 0), className: "flex-1 min-h-[44px]", children: isUpdating ? t("common:loading") : t("common:next") })) : (_jsx(Button, { onClick: handleSubscribeAndFinish, className: "flex-1 min-h-[44px]", children: t("common:done") }))] })] })] }) }));
}
