import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/hooks/useEvents";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/use-toast";
import { EventFormFields } from "@/components/events/EventFormFields";
import type { MtgFormat } from "@/types/database.types";

interface QuickMeetupFormProps {
  defaultValues?: Partial<{
    format: MtgFormat;
    city: string;
    min_players: number;
  }>;
}

export function QuickMeetupForm({ defaultValues }: QuickMeetupFormProps) {
  const { t } = useTranslation("events");
  const navigate = useNavigate();
  const { createEvent, isCreating } = useEvents();
  const user = useAuthStore((s) => s.user);

  const [format, setFormat] = useState<MtgFormat>(defaultValues?.format ?? "pauper");
  const [startsAt, setStartsAt] = useState("");
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [minPlayers, setMinPlayers] = useState(defaultValues?.min_players ?? 2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const startsAtDate = new Date(startsAt);

    try {
      await createEvent({
        organizer_id: user.id,
        type: "quick",
        format,
        city,
        starts_at: startsAtDate.toISOString(),
        min_players: minPlayers,
        // Quick meetups auto-expire 24h after start (DB trigger also handles this)
        expires_at: new Date(startsAtDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
      toast({ title: t("event_created") });
      navigate("/");
    } catch {
      toast({ title: t("common:error"), variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <EventFormFields
        format={format}
        onFormatChange={setFormat}
        city={city}
        onCityChange={setCity}
        startsAt={startsAt}
        onStartsAtChange={setStartsAt}
        minPlayers={minPlayers}
        onMinPlayersChange={setMinPlayers}
        idPrefix="q_"
      />

      <Button type="submit" className="w-full min-h-[44px]" disabled={isCreating}>
        {isCreating ? t("common:loading") : t("create_quick_meetup")}
      </Button>
    </form>
  );
}
