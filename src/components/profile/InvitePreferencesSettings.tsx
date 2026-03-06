import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { useInvitePreferences } from "@/hooks/useInvitePreferences";
import { useAuth } from "@/hooks/useAuth";
import { ScheduleGrid } from "@/components/shared/ScheduleGrid";
import { useToast } from "@/components/ui/use-toast";
import { FORMATS, DAYS, FORMAT_TOGGLE_COLORS } from "@/lib/constants";
import { Loader2, Save, UserPlus, Moon } from "lucide-react";
import type { MtgFormat, InviteVisibility } from "@/types/database.types";

const INVITE_SLOTS = ["day", "evening"] as const;
const BOOL_STATES = ["true", "false"] as const;
const BOOL_COLORS: Record<string, string> = {
  true: "bg-emerald-600 hover:bg-emerald-500",
  false: "bg-gray-700 hover:bg-gray-600",
};

export function InvitePreferencesSettings() {
  const { t } = useTranslation("profile");
  const { t: te } = useTranslation("events");
  const { t: tc } = useTranslation("common");
  const { user } = useAuth();
  const { prefs, isLoading, upsert, updateDnd, isUpdating } = useInvitePreferences();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [formats, setFormats] = useState<MtgFormat[]>([]);
  const [visibility, setVisibility] = useState<InviteVisibility>("all");
  const [dndDate, setDndDate] = useState("");

  useEffect(() => {
    if (prefs) {
      setIsOpen(prefs.is_open);
      // Convert boolean record to string record for ScheduleGrid
      const slotsStr: Record<string, string> = {};
      for (const [key, val] of Object.entries(prefs.available_slots as Record<string, boolean>)) {
        slotsStr[key] = String(val);
      }
      setSlots(slotsStr);
      setFormats(prefs.formats);
      setVisibility(prefs.visibility as InviteVisibility);
      if (prefs.dnd_until) {
        const d = new Date(prefs.dnd_until);
        if (d > new Date()) {
          setDndDate(d.toISOString().slice(0, 16));
        }
      }
    }
  }, [prefs]);

  function toggleFormat(format: MtgFormat) {
    setFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  }

  async function handleSave() {
    if (!user) return;
    try {
      // Convert string slots back to boolean
      const boolSlots: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(slots)) {
        boolSlots[key] = val === "true";
      }
      await upsert({
        user_id: user.id,
        is_open: isOpen,
        available_slots: boolSlots,
        formats,
        visibility,
      });
      toast({ title: t("profile_saved") });
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    }
  }

  async function handleDnd() {
    try {
      if (dndDate) {
        await updateDnd(new Date(dndDate).toISOString());
        toast({ title: t("dnd_enable") });
      } else {
        await updateDnd(null);
        toast({ title: t("dnd_disable") });
      }
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    }
  }

  if (isLoading) return null;

  const boolLabels: Record<string, string> = {
    true: t("available"),
    false: t("unavailable"),
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-gray-400">
          <UserPlus className="h-4 w-4" />
          {t("invite_prefs_title")}
        </CardTitle>
        <p className="text-sm text-gray-500">{t("invite_prefs_description")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Open toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center gap-3"
        >
          <div
            className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
              isOpen ? "border-accent bg-accent text-white" : "border-gray-600 bg-transparent"
            }`}
          >
            {isOpen && <UserPlus className="h-4 w-4" />}
          </div>
          <span className="text-base text-gray-200">{t("invite_open")}</span>
        </button>

        {isOpen && (
          <>
            {/* Schedule */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">{t("invite_schedule")}</p>
              <ScheduleGrid
                days={DAYS}
                slots={[...INVITE_SLOTS]}
                states={[...BOOL_STATES]}
                stateColors={BOOL_COLORS}
                stateLabels={boolLabels}
                value={slots}
                onChange={setSlots}
              />
            </div>

            {/* Formats */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">{t("invite_formats")}</p>
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

            {/* Visibility */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">{t("invite_visibility")}</p>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as InviteVisibility)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("visibility_all")}</SelectItem>
                  <SelectItem value="played_together">{t("visibility_played_together")}</SelectItem>
                  <SelectItem value="my_venues">{t("visibility_my_venues")}</SelectItem>
                  <SelectItem value="none">{t("visibility_none")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* DND */}
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-gray-400">
                <Moon className="h-4 w-4" />
                {t("dnd_mode")}
              </p>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={dndDate}
                  onChange={(e) => setDndDate(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={handleDnd} className="min-h-[44px]">
                  {dndDate ? t("dnd_enable") : t("dnd_disable")}
                </Button>
              </div>
            </div>
          </>
        )}

        <Button
          className="w-full min-h-[44px]"
          onClick={handleSave}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {tc("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
