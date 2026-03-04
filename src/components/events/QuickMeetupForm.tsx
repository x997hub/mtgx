import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEvents } from "@/hooks/useEvents";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/use-toast";
import { FORMATS } from "@/lib/constants";
import type { MtgFormat } from "@/types/database.types";

export function QuickMeetupForm() {
  const { t } = useTranslation("events");
  const navigate = useNavigate();
  const { createEvent, isCreating } = useEvents();
  const user = useAuthStore((s) => s.user);

  const [format, setFormat] = useState<MtgFormat>("pauper");
  const [startsAt, setStartsAt] = useState("");
  const [city, setCity] = useState("");
  const [minPlayers, setMinPlayers] = useState(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await createEvent({
        organizer_id: user.id,
        type: "quick",
        format,
        city,
        starts_at: new Date(startsAt).toISOString(),
        min_players: minPlayers,
      });
      toast({ title: t("event_created") });
      navigate("/");
    } catch {
      toast({ title: t("common:error"), variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("format")}</Label>
        <Select value={format} onValueChange={(v) => setFormat(v as MtgFormat)}>
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
        <Label htmlFor="q_starts_at">{t("date_time")}</Label>
        <Input
          id="q_starts_at"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="q_city">{t("city")}</Label>
        <Input
          id="q_city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="q_min_players">{t("min_players")}</Label>
        <Input
          id="q_min_players"
          type="number"
          min={2}
          value={minPlayers}
          onChange={(e) => setMinPlayers(Number(e.target.value))}
        />
      </div>

      <Button type="submit" className="w-full min-h-[44px]" disabled={isCreating}>
        {isCreating ? t("common:loading") : t("create_quick_meetup")}
      </Button>
    </form>
  );
}
