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
import { PLATFORM_FIELDS } from "@/lib/constants";
import type { MtgFormat, ProxyPolicy, EventMode, OnlinePlatform } from "@/types/database.types";

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
  mode: EventMode;
  onlinePlatform: OnlinePlatform | null;
  joinLink: string;
  platformUsername: string;
  contactLink: string;
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
  const [mode, setMode] = useState<EventMode>("in_person");
  const [onlinePlatform, setOnlinePlatform] = useState<OnlinePlatform | null>(null);
  const [joinLink, setJoinLink] = useState("");
  const [platformUsername, setPlatformUsername] = useState("");
  const [contactLink, setContactLink] = useState("");

  // Autosave
  const formState = useMemo<QuickFormState>(() => ({
    format, startsAt, venueId, city, minPlayers, proxyPolicy, mode, onlinePlatform, joinLink,
    platformUsername, contactLink,
  }), [format, startsAt, venueId, city, minPlayers, proxyPolicy, mode, onlinePlatform, joinLink, platformUsername, contactLink]);

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
      setMode(savedState.mode ?? "in_person");
      setOnlinePlatform(savedState.onlinePlatform ?? null);
      setJoinLink(savedState.joinLink ?? "");
      setPlatformUsername(savedState.platformUsername ?? "");
      setContactLink(savedState.contactLink ?? "");
      toast({ title: t("draft_restored", "Draft restored") });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if ((mode === "in_person" || mode === "hybrid") && !venueId) {
      toast({ title: t("venue_required", "Venue is required"), variant: "destructive" });
      return;
    }
    if ((mode === "online" || mode === "hybrid") && !onlinePlatform) {
      toast({ title: t("select_platform", "Platform is required"), variant: "destructive" });
      return;
    }
    if ((mode === "online" || mode === "hybrid") && onlinePlatform) {
      const fields = PLATFORM_FIELDS[onlinePlatform];
      if (fields.joinLink && !joinLink) {
        toast({ title: t("join_link_required", "Join link is required"), variant: "destructive" });
        return;
      }
      if (fields.platformUsername && !platformUsername) {
        toast({ title: t("platform_username_required", "Username is required"), variant: "destructive" });
        return;
      }
      if (fields.contactLink && !contactLink) {
        toast({ title: t("contact_link_required", "Contact link is required"), variant: "destructive" });
        return;
      }
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
        city: mode === "online" ? "Online" : city,
        venue_id: mode === "online" ? null : (venueId || null),
        starts_at: startsAtDate.toISOString(),
        min_players: minPlayers,
        proxy_policy: proxyPolicy,
        mode,
        online_platform: onlinePlatform || null,
        join_link: joinLink || null,
        platform_username: platformUsername || null,
        contact_link: contactLink || null,
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
        mode={mode}
        onModeChange={setMode}
        onlinePlatform={onlinePlatform}
        onOnlinePlatformChange={setOnlinePlatform}
        joinLink={joinLink}
        onJoinLinkChange={setJoinLink}
        platformUsername={platformUsername}
        onPlatformUsernameChange={setPlatformUsername}
        contactLink={contactLink}
        onContactLinkChange={setContactLink}
        idPrefix="q_"
      />

      <ProxyPolicySelector value={proxyPolicy} onChange={setProxyPolicy} />

      <Button type="submit" className="w-full min-h-[44px]" disabled={isCreating}>
        {isCreating ? t("common:loading") : t("create_quick_meetup")}
      </Button>
    </form>
  );
}
