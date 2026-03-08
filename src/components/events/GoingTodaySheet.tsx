import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useGoingToday } from "@/hooks/useGoingToday";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/use-toast";
import { useFormatToggle } from "@/hooks/useFormatToggle";
import { FORMATS, FORMAT_TOGGLE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MtgFormat } from "@/types/database.types";

interface GoingTodaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DURATION_OPTIONS = [1, 2, 3, 4, 5] as const;

export function GoingTodaySheet({ open, onOpenChange }: GoingTodaySheetProps) {
  const { t } = useTranslation(["events", "common"]);
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const city = profile?.city ?? "";

  const { instantCount, activate, deactivate, myInstant, isActivating, isDeactivating } =
    useGoingToday(city);

  const [selectedFormats, setSelectedFormats] = useState<MtgFormat[]>(
    profile?.formats ?? []
  );
  const [duration, setDuration] = useState<number>(3);

  const onFormatsChange = useCallback((fmts: MtgFormat[]) => setSelectedFormats(fmts), []);
  const toggleFormat = useFormatToggle(selectedFormats, onFormatsChange);

  // Show suggestion toast when 3+ players are looking
  useEffect(() => {
    if (instantCount >= 3 && myInstant) {
      toast({
        title: t("events:instant_meetup_suggestion", {
          count: instantCount,
          defaultValue: `${instantCount} players available! Create a meetup?`,
        }),
      });
    }
  }, [instantCount, myInstant, t]);

  const handleActivate = () => {
    if (selectedFormats.length === 0) {
      toast({ title: t("events:lfg_select_formats"), variant: "destructive" });
      return;
    }
    if (!city) {
      toast({ title: t("events:city_required"), variant: "destructive" });
      return;
    }

    activate(
      { city, formats: selectedFormats, duration_hours: duration },
      {
        onSuccess: () => {
          toast({ title: t("events:going_today_active", "You're going today!") });
          onOpenChange(false);
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
        onOpenChange(false);
      },
    });
  };

  const handleCreateMeetup = () => {
    onOpenChange(false);
    navigate("/events/new");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            {t("events:going_today", "Going Today")}
          </SheetTitle>
          <SheetDescription>
            {t("events:going_today_description", "Let others know you're free to play right now")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Active signal info */}
          {myInstant && (
            <div className="rounded-lg bg-accent/10 border border-accent/30 p-3">
              <p className="text-sm text-accent mb-2">
                {t("events:going_today_active_info", "Your signal is active!")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="border-accent/40 text-accent"
              >
                {t("events:deactivate", "Deactivate")}
              </Button>
            </div>
          )}

          {/* Duration picker */}
          {!myInstant && (
            <>
              <div className="space-y-2">
                <Label>{t("events:duration", "Duration")}</Label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      aria-pressed={duration === h}
                      onClick={() => setDuration(h)}
                      className={cn(
                        "flex-1 rounded-lg py-2 text-base font-medium transition-colors",
                        duration === h
                          ? "bg-accent text-white"
                          : "bg-gray-700 text-gray-400"
                      )}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Format multi-select */}
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
                        className={cn(
                          "rounded-full px-4 py-1.5 text-base font-medium transition-colors",
                          active ? colors.active : colors.inactive
                        )}
                      >
                        {t(`events:${format}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Activate button */}
              <Button
                className="w-full min-h-[44px]"
                onClick={handleActivate}
                disabled={isActivating || selectedFormats.length === 0}
              >
                <Zap className="h-4 w-4 me-2" />
                {isActivating ? t("common:loading") : t("events:activate_going_today", "Activate")}
              </Button>
            </>
          )}

          {/* Live counter / suggestion */}
          {instantCount >= 3 && (
            <div className="rounded-lg bg-emerald-900/20 border border-emerald-700/40 p-3 space-y-2">
              <p className="text-sm text-emerald-300">
                {t("events:players_looking_count", {
                  count: instantCount,
                  defaultValue: `${instantCount} players are looking to play!`,
                })}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateMeetup}
                className="border-emerald-700/40 text-emerald-300"
              >
                {t("events:create_meetup_suggestion", "Create a meetup")}
              </Button>
            </div>
          )}

          {instantCount > 0 && instantCount < 3 && (
            <p className="text-sm text-text-secondary text-center">
              {t("events:players_looking_count", {
                count: instantCount,
                defaultValue: `${instantCount} player(s) looking`,
              })}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
