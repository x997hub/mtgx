import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvailablePlayersHint } from "@/components/events/AvailablePlayersHint";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FORMATS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { MtgFormat } from "@/types/database.types";

const TIME_PRESETS = ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];

export interface EventFormFieldsProps {
  format: MtgFormat;
  onFormatChange: (format: MtgFormat) => void;
  venueId: string;
  onVenueIdChange: (id: string) => void;
  onCityChange: (city: string) => void;
  startsAt: string;
  onStartsAtChange: (startsAt: string) => void;
  minPlayers: number;
  onMinPlayersChange: (minPlayers: number) => void;
  /** HTML id prefix to avoid collisions when both forms are on the same page */
  idPrefix?: string;
}

export function EventFormFields({
  format,
  onFormatChange,
  venueId,
  onVenueIdChange,
  onCityChange,
  startsAt,
  onStartsAtChange,
  minPlayers,
  onMinPlayersChange,
  idPrefix = "",
}: EventFormFieldsProps) {
  const { t } = useTranslation("events");
  const id = (name: string) => `${idPrefix}${name}`;

  // Fetch all venues
  const { data: venues } = useQuery({
    queryKey: ["venues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id, name, city")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Auto-fill city when venue changes
  const selectedVenue = venues?.find((v) => v.id === venueId);
  useEffect(() => {
    if (selectedVenue) {
      onCityChange(selectedVenue.city);
    } else if (!venueId) {
      onCityChange("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, selectedVenue?.city]);

  // Internal date/time state for split picker
  const [internalDate, setInternalDate] = useState(() =>
    startsAt?.includes("T") ? startsAt.split("T")[0] : "",
  );
  const [internalTime, setInternalTime] = useState(() =>
    startsAt?.includes("T") ? (startsAt.split("T")[1]?.slice(0, 5) ?? "") : "",
  );
  const [showCustomTime, setShowCustomTime] = useState(
    () => !!internalTime && !TIME_PRESETS.includes(internalTime),
  );

  // Sync from prop (e.g. autosave restore)
  useEffect(() => {
    if (startsAt?.includes("T")) {
      const [d, rest] = startsAt.split("T");
      setInternalDate(d);
      const t = rest?.slice(0, 5) ?? "";
      setInternalTime(t);
      if (t && !TIME_PRESETS.includes(t)) setShowCustomTime(true);
    } else if (!startsAt) {
      setInternalDate("");
      setInternalTime("");
    }
  }, [startsAt]);

  const propagate = (d: string, t: string) => {
    if (d && t) onStartsAtChange(`${d}T${t}`);
  };

  const handleDateChange = (newDate: string) => {
    setInternalDate(newDate);
    propagate(newDate, internalTime);
  };

  const handleTimePreset = (preset: string) => {
    setInternalTime(preset);
    setShowCustomTime(false);
    propagate(internalDate, preset);
  };

  const handleCustomTimeChange = (newTime: string) => {
    setInternalTime(newTime);
    propagate(internalDate, newTime);
  };

  return (
    <>
      <div className="space-y-2">
        <Label>{t("format")}</Label>
        <Select value={format} onValueChange={(v) => onFormatChange(v as MtgFormat)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map((f) => (
              <SelectItem key={f} value={f}>
                {t(f)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t("venue")} *</Label>
        <Select
          value={venueId || "none"}
          onValueChange={(v) => onVenueIdChange(v === "none" ? "" : v)}
        >
          <SelectTrigger data-invalid={!venueId || undefined}>
            <SelectValue placeholder={t("select_venue")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {venues?.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name} — {v.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!venueId && (
          <p className="text-sm text-red-400">{t("venue_required", "Venue is required")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={id("date")}>{t("date", "Date")}</Label>
        <Input
          id={id("date")}
          type="date"
          value={internalDate}
          onChange={(e) => handleDateChange(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>{t("time", "Time")}</Label>
        <div className="flex flex-wrap gap-2">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleTimePreset(preset)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                internalTime === preset && !showCustomTime
                  ? "bg-accent text-white"
                  : "bg-surface-card border border-border text-text-primary hover:bg-surface-card/80",
              )}
            >
              {preset}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCustomTime(true)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              showCustomTime
                ? "bg-accent text-white"
                : "bg-surface-card border border-border text-text-primary hover:bg-surface-card/80",
            )}
          >
            {t("other_time", "Other")}
          </button>
        </div>
        {showCustomTime && (
          <Input
            type="time"
            value={internalTime}
            onChange={(e) => handleCustomTimeChange(e.target.value)}
          />
        )}
      </div>

      <AvailablePlayersHint
        city={selectedVenue?.city ?? ""}
        format={format}
        startsAt={startsAt}
      />

      <div className="space-y-2">
        <Label htmlFor={id("min_players")}>{t("min_players")}</Label>
        <Input
          id={id("min_players")}
          type="number"
          min={2}
          value={minPlayers}
          onChange={(e) => onMinPlayersChange(Number(e.target.value))}
        />
      </div>
    </>
  );
}
