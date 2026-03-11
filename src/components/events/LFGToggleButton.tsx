import { useState, useCallback } from "react";
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
import { useFormatToggle } from "@/hooks/useFormatToggle";
import { FORMATS, CITIES, SLOTS, FORMAT_TOGGLE_COLORS } from "@/lib/constants";
import type { MtgFormat, TimeSlot } from "@/types/database.types";

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
  const [durationHours, setDurationHours] = useState(4);
  const [isOnline, setIsOnline] = useState(false);

  const onFormatsChange = useCallback((fmts: MtgFormat[]) => setSelectedFormats(fmts), []);
  const toggleFormat = useFormatToggle(selectedFormats, onFormatsChange);

  const handleActivate = () => {
    if (selectedFormats.length === 0) {
      toast({ title: t("events:lfg_select_formats"), variant: "destructive" });
      return;
    }
    activate(
      {
        city: isOnline ? "Online" : selectedCity,
        formats: selectedFormats,
        preferred_slot: selectedSlot || null,
        durationHours,
        is_online: isOnline,
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
    const remainingMs = Math.max(0, new Date(mySignal.expires_at).getTime() - Date.now());
    const remainingH = Math.floor(remainingMs / 3600000);
    const remainingM = Math.floor((remainingMs % 3600000) / 60000);
    const remainingText = remainingMs <= 0
      ? t("events:signal_expired")
      : remainingH > 0
        ? `${remainingH}${t("events:hours_short")} ${remainingM}${t("events:minutes_short")}`
        : `${remainingM}${t("events:minutes_short")}`;

    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          className="gap-2 min-h-[44px]"
          onClick={handleDeactivate}
          disabled={isDeactivating}
        >
          <ZapOff className="h-4 w-4" />
          {t("events:lfg_active")} ({remainingText})
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
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("events:lfg_activate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Online toggle */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsOnline(!isOnline)}
                className={`rounded-full px-4 py-1.5 text-base font-medium transition-colors ${
                  isOnline
                    ? "bg-accent text-white"
                    : "bg-border text-text-secondary"
                }`}
              >
                {t("events:online_lfg")}
              </button>
            </div>

            {/* City */}
            {!isOnline && (
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
            )}

            {/* Formats — multi-select toggles */}
            <div className="space-y-2">
              <Label>{t("events:format")}</Label>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((format) => {
                  const active = selectedFormats.includes(format);
                  const colors = FORMAT_TOGGLE_COLORS[format];
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
                        : "bg-border text-text-secondary"
                    }`}
                  >
                    {t(`profile:${slot}_slot`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>{t("events:lfg_duration")}</Label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((h) => (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={durationHours === h}
                    onClick={() => setDurationHours(h)}
                    className={`rounded-full px-4 py-1.5 text-base font-medium transition-colors ${
                      durationHours === h
                        ? "bg-accent text-white"
                        : "bg-surface-card border border-border text-text-secondary"
                    }`}
                  >
                    {h < 5 ? t("events:duration_hours", { count: h }) : "5+"}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full min-h-[44px]"
              onClick={handleActivate}
              disabled={isActivating || (!isOnline && !selectedCity) || selectedFormats.length === 0}
            >
              <Zap className="h-4 w-4 me-2" />
              {isActivating ? t("common:loading") : t("events:lfg_activate")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
