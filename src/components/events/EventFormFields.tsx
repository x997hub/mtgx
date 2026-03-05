import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FORMATS, CITIES } from "@/lib/constants";
import type { MtgFormat } from "@/types/database.types";

export interface EventFormFieldsProps {
  format: MtgFormat;
  onFormatChange: (format: MtgFormat) => void;
  city: string;
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
  city,
  onCityChange,
  startsAt,
  onStartsAtChange,
  minPlayers,
  onMinPlayersChange,
  idPrefix = "",
}: EventFormFieldsProps) {
  const { t } = useTranslation("events");

  const id = (name: string) => `${idPrefix}${name}`;

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
        <Label>{t("city")} *</Label>
        <Select value={city} onValueChange={onCityChange} required>
          <SelectTrigger data-invalid={!city || undefined}>
            <SelectValue placeholder={t("city")} />
          </SelectTrigger>
          <SelectContent>
            {CITIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!city && (
          <p className="text-sm text-red-400">{t("city_required", "City is required")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={id("starts_at")}>{t("date_time")}</Label>
        <Input
          id={id("starts_at")}
          type="datetime-local"
          value={startsAt}
          onChange={(e) => onStartsAtChange(e.target.value)}
          required
        />
      </div>

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
