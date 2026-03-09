import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/hooks/useEvents";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/use-toast";
import { EventFormFields } from "@/components/events/EventFormFields";
import { useFormAutosave } from "@/hooks/useFormAutosave";
import { ProxyPolicySelector } from "@/components/events/ProxyPolicySelector";
import type { MtgFormat, ProxyPolicy } from "@/types/database.types";

interface QuickMeetupFormProps {
  defaultValues?: Partial<{
    format: MtgFormat;
    city: string;
    venue_id: string;
    min_players: number;
  }>;
  onCreated?: (eventId: string) => void;
}

interface QuickFormState {
  format: MtgFormat;
  startsAt: string;
  venueId: string;
  city: string;
  minPlayers: number;
  proxyPolicy: ProxyPolicy;
}

export function QuickMeetupForm({ defaultValues, onCreated }: QuickMeetupFormProps) {
  const { t } = useTranslation("events");
  const navigate = useNavigate();
  const { createEvent, isCreating } = useEvents();
  const user = useAuthStore((s) => s.user);

  const [format, setFormat] = useState<MtgFormat>(defaultValues?.format ?? "pauper");
  const [startsAt, setStartsAt] = useState("");
  const [venueId, setVenueId] = useState(defaultValues?.venue_id ?? "");
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [minPlayers, setMinPlayers] = useState(defaultValues?.min_players ?? 2);
  const [proxyPolicy, setProxyPolicy] = useState<ProxyPolicy>("none");

  // Autosave
  const formState = useMemo<QuickFormState>(() => ({
    format, startsAt, venueId, city, minPlayers, proxyPolicy,
  }), [format, startsAt, venueId, city, minPlayers, proxyPolicy]);

  const autosaveKey = `event-draft-${user?.id ?? "anon"}-quick`;
  const { savedState, clearSaved, hasSaved } = useFormAutosave(autosaveKey, formState);

  // Restore from draft
  useEffect(() => {
    if (hasSaved && savedState && !defaultValues) {
      setFormat(savedState.format);
      setStartsAt(savedState.startsAt);
      setVenueId(savedState.venueId ?? "");
      setCity(savedState.city);
      setMinPlayers(savedState.minPlayers);
      setProxyPolicy(savedState.proxyPolicy ?? "none");
      toast({ title: t("draft_restored", "Draft restored") });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!venueId) {
      toast({ title: t("venue_required", "Venue is required"), variant: "destructive" });
      return;
    }
    if (!startsAt) {
      toast({ title: t("date_required", "Date is required"), variant: "destructive" });
      return;
    }
    if (new Date(startsAt) <= new Date()) {
      toast({ title: t("date_must_be_future", "Event must be in the future"), variant: "destructive" });
      return;
    }

    const startsAtDate = new Date(startsAt);

    try {
      const data = await createEvent({
        organizer_id: user.id,
        type: "quick",
        format,
        city,
        venue_id: venueId || null,
        starts_at: startsAtDate.toISOString(),
        min_players: minPlayers,
        proxy_policy: proxyPolicy,
        // Quick meetups auto-expire 24h after start (DB trigger also handles this)
        expires_at: new Date(startsAtDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
      clearSaved();
      toast({ title: t("event_created") });
      if (onCreated) {
        onCreated(data.id);
      } else {
        navigate("/");
      }
    } catch {
      toast({ title: t("common:error"), variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <EventFormFields
        format={format}
        onFormatChange={setFormat}
        venueId={venueId}
        onVenueIdChange={setVenueId}
        onCityChange={setCity}
        startsAt={startsAt}
        onStartsAtChange={setStartsAt}
        minPlayers={minPlayers}
        onMinPlayersChange={setMinPlayers}
        idPrefix="q_"
      />

      <ProxyPolicySelector value={proxyPolicy} onChange={setProxyPolicy} />

      <Button type="submit" className="w-full min-h-[44px]" disabled={isCreating}>
        {isCreating ? t("common:loading") : t("create_quick_meetup")}
      </Button>
    </form>
  );
}
