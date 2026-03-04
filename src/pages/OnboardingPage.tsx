import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/components/ui/use-toast";
import { FORMATS, CITIES, DAYS, SLOTS } from "@/lib/constants";
import type { MtgFormat, DayOfWeek, TimeSlot, AvailabilityInsert } from "@/types/database.types";

export default function OnboardingPage() {
  const { t } = useTranslation(["profile", "common", "events"]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateProfile, updateAvailability, isUpdating } = useProfile();
  const { subscribe } = useSubscription();

  const [step, setStep] = useState(0);
  const [city, setCity] = useState("");
  const [formats, setFormats] = useState<MtgFormat[]>([]);
  const [availability, setAvailability] = useState<
    Record<string, boolean>
  >({});

  const toggleFormat = (format: MtgFormat) => {
    setFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const toggleAvailability = (day: DayOfWeek, slot: TimeSlot) => {
    const key = `${day}-${slot}`;
    setAvailability((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await updateProfile({ city, formats });
      toast({ title: t("profile:profile_saved") });
    } catch {
      toast({ title: t("common:error"), variant: "destructive" });
    }
  };

  const handleSaveAvailability = async () => {
    if (!user) return;
    const slots: AvailabilityInsert[] = Object.entries(availability)
      .filter(([, active]) => active)
      .map(([key]) => {
        const [day, slot] = key.split("-") as [DayOfWeek, TimeSlot];
        return { user_id: user.id, day, slot, level: "available" as const };
      });
    try {
      await updateAvailability(slots);
    } catch {
      toast({ title: t("common:error"), variant: "destructive" });
    }
  };

  const handleNext = async () => {
    if (step === 0 && city) {
      await handleSaveProfile();
      setStep(1);
    } else if (step === 1 && formats.length > 0) {
      await handleSaveProfile();
      setStep(2);
    } else if (step === 2) {
      await handleSaveAvailability();
      setStep(3);
    } else if (step === 3) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-md bg-surface-card border-surface-hover">
        <CardHeader>
          <div className="w-full bg-surface-hover rounded-full h-2 mb-4">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <CardTitle className="text-text-primary text-lg text-center">
            {step === 0 && t("profile:onboarding_city")}
            {step === 1 && t("profile:onboarding_formats")}
            {step === 2 && t("profile:onboarding_availability")}
            {step === 3 && t("profile:onboarding_subscribe")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 0: City selection */}
          {step === 0 && (
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder={t("profile:select_city")} />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Step 1: Format selection */}
          {step === 1 && (
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((format) => (
                <Badge
                  key={format}
                  variant={formats.includes(format) ? "default" : "outline"}
                  className={`cursor-pointer px-4 py-2 text-sm min-h-[44px] flex items-center transition-colors ${
                    formats.includes(format)
                      ? "bg-accent text-white hover:bg-accent/80"
                      : "border-surface-hover text-text-secondary hover:bg-surface-hover"
                  }`}
                  onClick={() => toggleFormat(format)}
                >
                  {t(`events:${format}`)}
                </Badge>
              ))}
            </div>
          )}

          {/* Step 2: Availability */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                {t("profile:availability_description")}
              </p>
              <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center">
                <div />
                {SLOTS.map((slot) => (
                  <div key={slot} className="text-center text-sm text-text-secondary font-medium">
                    {t(`profile:${slot}_slot`)}
                  </div>
                ))}
                {DAYS.map((day) => (
                  <>
                    <div key={`label-${day}`} className="text-sm text-text-secondary font-medium pr-2">
                      {t(`profile:${day}`)}
                    </div>
                    {SLOTS.map((slot) => {
                      const key = `${day}-${slot}`;
                      const isActive = !!availability[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleAvailability(day, slot)}
                          className={`min-h-[44px] rounded-lg border transition-colors ${
                            isActive
                              ? "bg-accent/20 border-accent text-accent"
                              : "bg-surface border-surface-hover text-text-secondary hover:bg-surface-hover"
                          }`}
                        >
                          {isActive ? "+" : "-"}
                        </button>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Subscriptions */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary text-center">
                {t("profile:onboarding_subscribe")}
              </p>
              {city && formats.length > 0 && (
                <div className="space-y-2">
                  {formats.map((format) => (
                    <div
                      key={format}
                      className="flex items-center justify-between rounded-lg border border-surface-hover px-4 py-3"
                    >
                      <span className="text-text-primary text-sm">
                        {t(`events:${format}`)} in {city}
                      </span>
                      <Badge variant="outline" className="text-accent border-accent">
                        {t("common:subscribe")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {step === 2 && (
              <Button
                variant="outline"
                onClick={handleSkipAvailability}
                className="flex-1 min-h-[44px] border-surface-hover text-text-secondary"
              >
                {t("common:skip")}
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={
                  isUpdating ||
                  (step === 0 && !city) ||
                  (step === 1 && formats.length === 0)
                }
                className="flex-1 min-h-[44px]"
              >
                {isUpdating ? t("common:loading") : t("common:next")}
              </Button>
            ) : (
              <Button
                onClick={handleSubscribeAndFinish}
                className="flex-1 min-h-[44px]"
              >
                {t("common:done")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
