import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAutoMatch } from "@/hooks/useAutoMatch";
import { useAuth } from "@/hooks/useAuth";
import { ScheduleGrid } from "@/components/shared/ScheduleGrid";
import { useToast } from "@/components/ui/use-toast";
import { useFormatToggle } from "@/hooks/useFormatToggle";
import { FORMATS, DAYS, FORMAT_TOGGLE_COLORS } from "@/lib/constants";
import { Loader2, Save, Zap } from "lucide-react";
import type { MtgFormat, MatchDayPref, MatchRadius } from "@/types/database.types";

const MATCH_SLOTS = ["day", "evening"] as const;
const MATCH_STATES: MatchDayPref[] = ["always", "if_free", "never"];
const MATCH_STATE_COLORS: Record<MatchDayPref, string> = {
  always: "bg-emerald-600 hover:bg-emerald-500",
  if_free: "bg-amber-600 hover:bg-amber-500",
  never: "bg-gray-700 hover:bg-gray-600",
};

export function AutoMatchSettings() {
  const { t } = useTranslation("profile");
  const { t: te } = useTranslation("events");
  const { t: tc } = useTranslation("common");
  const { user } = useAuth();
  const { prefs, isLoading, upsert, isUpdating } = useAutoMatch();
  const { toast } = useToast();

  const [formats, setFormats] = useState<MtgFormat[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>(["big", "quick"]);
  const [matchDays, setMatchDays] = useState<Record<string, MatchDayPref>>({});
  const [radius, setRadius] = useState<MatchRadius>("my_city");
  const [maxDaily, setMaxDaily] = useState(3);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (prefs) {
      setFormats(prefs.formats);
      setEventTypes(prefs.event_types);
      setMatchDays(prefs.match_days as Record<string, MatchDayPref>);
      setRadius(prefs.radius as MatchRadius);
      setMaxDaily(prefs.max_daily_notifications);
      setIsActive(prefs.is_active);
    }
  }, [prefs]);

  const onFormatsChange = useCallback((fmts: MtgFormat[]) => setFormats(fmts), []);
  const toggleFormat = useFormatToggle(formats, onFormatsChange);

  function toggleEventType(type: string) {
    setEventTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function handleSave() {
    if (!user) return;
    try {
      await upsert({
        user_id: user.id,
        formats,
        event_types: eventTypes,
        match_days: matchDays,
        radius,
        max_daily_notifications: maxDaily,
        is_active: isActive,
      });
      toast({ title: t("profile_saved") });
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    }
  }

  if (isLoading) return null;

  const matchStateLabels: Record<MatchDayPref, string> = {
    always: t("always"),
    if_free: t("if_free"),
    never: t("never"),
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-gray-400">
          <Zap className="h-4 w-4" />
          {t("auto_match_title")}
        </CardTitle>
        <p className="text-sm text-gray-500">{t("auto_match_description")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active toggle */}
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className="flex w-full items-center gap-3"
        >
          <div
            className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
              isActive ? "border-accent bg-accent text-white" : "border-gray-600 bg-transparent"
            }`}
          >
            {isActive && <Zap className="h-4 w-4" />}
          </div>
          <span className="text-base text-gray-200">{t("auto_match_active")}</span>
        </button>

        {isActive && (
          <>
            {/* Formats */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">{t("auto_match_formats")}</p>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((format) => {
                  const active = formats.includes(format);
                  const colors = FORMAT_TOGGLE_COLORS[format];
                  return (
                    <button
                      key={format}
                      type="button"
                      onClick={() => toggleFormat(format)}
                      className={`rounded-full px-4 py-1.5 text-base font-medium transition-colors ${
                        active ? colors.active : colors.inactive
                      }`}
                    >
                      {te(format)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Event types */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">{t("auto_match_event_types")}</p>
              <div className="flex flex-wrap gap-2">
                {["big", "quick"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleEventType(type)}
                    className={`rounded-full px-4 py-1.5 text-base font-medium transition-colors ${
                      eventTypes.includes(type)
                        ? "bg-accent text-white"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {tc(type === "big" ? "big_event" : "quick_meetup")}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule grid */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">{t("auto_match_schedule")}</p>
              <ScheduleGrid
                days={DAYS}
                slots={[...MATCH_SLOTS]}
                states={MATCH_STATES}
                stateColors={MATCH_STATE_COLORS}
                stateLabels={matchStateLabels}
                value={matchDays}
                onChange={setMatchDays}
              />
            </div>

            {/* Radius */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">{t("auto_match_radius")}</p>
              <Select value={radius} onValueChange={(v) => setRadius(v as MatchRadius)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="my_city">{t("radius_my_city")}</SelectItem>
                  <SelectItem value="nearby">{t("radius_nearby")}</SelectItem>
                  <SelectItem value="all">{t("radius_all")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max daily */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">{t("auto_match_max_daily")}</p>
              <Select
                value={String(maxDaily)}
                onValueChange={(v) => setMaxDaily(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="0">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <Button
          className="w-full min-h-[44px]"
          onClick={handleSave}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="me-2 h-4 w-4" />
          )}
          {tc("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
