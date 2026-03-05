import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { useLFG } from "@/hooks/useLFG";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/use-toast";
import { FORMATS, CITIES, SLOTS } from "@/lib/constants";
import type { MtgFormat, TimeSlot } from "@/types/database.types";

const FORMAT_COLORS: Record<MtgFormat, { active: string; inactive: string }> = {
  pauper: { active: "bg-emerald-700 text-emerald-100", inactive: "bg-gray-700 text-gray-400" },
  commander: { active: "bg-purple-700 text-purple-100", inactive: "bg-gray-700 text-gray-400" },
  standard: { active: "bg-blue-700 text-blue-100", inactive: "bg-gray-700 text-gray-400" },
  draft: { active: "bg-amber-700 text-amber-100", inactive: "bg-gray-700 text-gray-400" },
};

export function LFGToggleButton() {
  const { t } = useTranslation(["events", "profile"]);
  const profile = useAuthStore((s) => s.profile);
  const { mySignal, activate, deactivate, isActivating, isDeactivating } = useLFG(
    profile?.city
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<MtgFormat[]>(
    profile?.formats ?? []
  );
  const [selectedCity, setSelectedCity] = useState(profile?.city ?? "");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | "">("");

  const toggleFormat = (format: MtgFormat) => {
    setSelectedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const handleActivate = () => {
    if (selectedFormats.length === 0) {
      toast({ title: t("events:lfg_select_formats"), variant: "destructive" });
      return;
    }
    activate(
      {
        city: selectedCity,
        formats: selectedFormats,
        preferred_slot: selectedSlot || null,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          toast({ title: t("events:lfg_active") });
        },
        onError: () => {
          toast({ title: t("common:error"), variant: "destructive" });
        },
      }
    );
  };

  const handleDeactivate = () => {
    deactivate(undefined, {
      onSuccess: () => {
        toast({ title: t("common:success", "Signal removed") });
      },
    });
  };

  if (mySignal) {
    const expiresIn = Math.max(
      0,
      Math.round((new Date(mySignal.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))
    );

    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          className="gap-2 min-h-[44px]"
          onClick={handleDeactivate}
          disabled={isDeactivating}
        >
          <ZapOff className="h-4 w-4" />
          {t("events:lfg_active")} ({t("events:lfg_expires", { hours: expiresIn })})
        </Button>
        <div className="flex flex-wrap gap-1">
          {mySignal.formats.map((f) => (
            <FormatBadge key={f} format={f} />
          ))}
          {mySignal.preferred_slot && (
            <Badge variant="outline" className="border-accent/40 text-accent">
              {t(`profile:${mySignal.preferred_slot}_slot`)}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className="gap-2 min-h-[44px] border-accent/40 text-accent hover:bg-accent/10"
        onClick={() => setDialogOpen(true)}
      >
        <Zap className="h-4 w-4" />
        {t("events:lfg_activate")}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("events:lfg_activate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* City */}
            <div className="space-y-2">
              <Label>{t("events:city")}</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder={t("events:city")} />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Formats — multi-select toggles */}
            <div className="space-y-2">
              <Label>{t("events:format")}</Label>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((format) => {
                  const active = selectedFormats.includes(format);
                  const colors = FORMAT_COLORS[format];
                  return (
                    <button
                      key={format}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleFormat(format)}
                      className={`rounded-full px-4 py-1.5 text-base font-medium transition-colors ${
                        active ? colors.active : colors.inactive
                      }`}
                    >
                      {t(`events:${format}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slot */}
            <div className="space-y-2">
              <Label>{t("events:lfg_preferred_time")}</Label>
              <div className="flex flex-wrap gap-2">
                {SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    aria-pressed={selectedSlot === slot}
                    onClick={() => setSelectedSlot(selectedSlot === slot ? "" : slot)}
                    className={`rounded-full px-4 py-1.5 text-base font-medium transition-colors ${
                      selectedSlot === slot
                        ? "bg-accent text-white"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {t(`profile:${slot}_slot`)}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full min-h-[44px]"
              onClick={handleActivate}
              disabled={isActivating || !selectedCity || selectedFormats.length === 0}
            >
              <Zap className="h-4 w-4 mr-2" />
              {isActivating ? t("common:loading") : t("events:lfg_activate")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
