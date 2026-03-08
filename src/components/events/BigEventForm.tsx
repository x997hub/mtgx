import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { EventFormFields } from "@/components/events/EventFormFields";
import { MoodTagSelector } from "@/components/events/MoodTagSelector";
import { ProxyPolicySelector } from "@/components/events/ProxyPolicySelector";
import { RecurrencePicker } from "@/components/events/RecurrencePicker";
import type { RecurrenceConfig } from "@/components/events/RecurrencePicker";
import { useFormAutosave } from "@/hooks/useFormAutosave";
import type { MtgFormat, ProxyPolicy, DayOfWeek } from "@/types/database.types";

interface BigEventFormProps {
  defaultValues?: Partial<{
    title: string;
    format: MtgFormat;
    city: string;
    venue_id: string;
    min_players: number;
    max_players: number;
    fee_text: string;
    description: string;
  }>;
  /** UUID of the event being cloned, if any */
  clonedFrom?: string;
  onCreated?: (eventId: string) => void;
}

interface BigFormState {
  title: string;
  format: MtgFormat;
  startsAt: string;
  venueId: string;
  city: string;
  minPlayers: number;
  maxPlayers: number;
  feeText: string;
  description: string;
  moodTags: string[];
  proxyPolicy: ProxyPolicy;
  recurrence: RecurrenceConfig | null;
}

export function BigEventForm({ defaultValues, clonedFrom, onCreated }: BigEventFormProps) {
  const { t } = useTranslation("events");
  const navigate = useNavigate();
  const { createEvent, isCreating } = useEvents();
  const user = useAuthStore((s) => s.user);

  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [format, setFormat] = useState<MtgFormat>(defaultValues?.format ?? "pauper");
  const [startsAt, setStartsAt] = useState("");
  const [venueId, setVenueId] = useState(defaultValues?.venue_id ?? "");
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [minPlayers, setMinPlayers] = useState(defaultValues?.min_players ?? 4);
  const [maxPlayers, setMaxPlayers] = useState(defaultValues?.max_players ?? 16);
  const [feeText, setFeeText] = useState(defaultValues?.fee_text ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [proxyPolicy, setProxyPolicy] = useState<ProxyPolicy>("none");
  const [recurrence, setRecurrence] = useState<RecurrenceConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autosave
  const formState = useMemo<BigFormState>(() => ({
    title, format, startsAt, venueId, city, minPlayers, maxPlayers,
    feeText, description, moodTags, proxyPolicy, recurrence,
  }), [title, format, startsAt, venueId, city, minPlayers, maxPlayers, feeText, description, moodTags, proxyPolicy, recurrence]);

  const autosaveKey = `event-draft-${user?.id ?? "anon"}-big`;
  const { savedState, clearSaved, hasSaved } = useFormAutosave(autosaveKey, formState);

  // Restore from draft (only once, when no defaultValues are provided)
  useEffect(() => {
    if (hasSaved && savedState && !defaultValues) {
      setTitle(savedState.title);
      setFormat(savedState.format);
      setStartsAt(savedState.startsAt);
      setVenueId(savedState.venueId);
      setCity(savedState.city);
      setMinPlayers(savedState.minPlayers);
      setMaxPlayers(savedState.maxPlayers);
      setFeeText(savedState.feeText);
      setDescription(savedState.description);
      setMoodTags(savedState.moodTags ?? []);
      setProxyPolicy(savedState.proxyPolicy ?? "none");
      setRecurrence(savedState.recurrence ?? null);
      toast({ title: t("draft_restored", "Draft restored") });
    }
    // eslint-disable-next-line
  }, []);

  const { data: venues } = useQuery({
    queryKey: ["venues", city],
    queryFn: async () => {
      let query = supabase.from("venues").select("id, name, city");
      if (city) query = query.eq("city", city);
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    if (!city) {
      toast({ title: t("city_required", "City is required"), variant: "destructive" });
      return;
    }
    if (maxPlayers != null && maxPlayers < minPlayers) {
      toast({ title: t("max_less_than_min", "Max players must be ≥ min players"), variant: "destructive" });
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

    try {
      const eventData: Parameters<typeof createEvent>[0] = {
        organizer_id: user.id,
        type: "big",
        title,
        format,
        city,
        starts_at: new Date(startsAt).toISOString(),
        venue_id: venueId || null,
        min_players: minPlayers,
        max_players: maxPlayers,
        fee_text: feeText || null,
        description: description || null,
        cloned_from: clonedFrom ?? null,
        mood_tags: moodTags.length > 0 ? moodTags : [],
        proxy_policy: proxyPolicy,
      };

      const data = await createEvent(eventData);

      // If recurrence is set, also create an event_template
      if (recurrence && recurrence.days.length > 0) {
        const dayMap: Record<DayOfWeek, string> = {
          sun: "SU", mon: "MO", tue: "TU", wed: "WE", thu: "TH", fri: "FR", sat: "SA",
        };
        const byDay = recurrence.days.map((d) => dayMap[d]).join(",");
        let rrule = `FREQ=WEEKLY;BYDAY=${byDay}`;
        if (recurrence.until) {
          rrule += `;UNTIL=${recurrence.until.replace(/-/g, "")}T235959Z`;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: templateData } = await (supabase.from("event_templates") as any).insert({
          organizer_id: user.id,
          venue_id: venueId || null,
          recurrence_rule: rrule,
          template_data: {
            title, format, city, min_players: minPlayers, max_players: maxPlayers,
            fee_text: feeText || null, description: description || null,
            mood_tags: moodTags, proxy_policy: proxyPolicy,
          },
        }).select("id").single();

        // Update the event with template reference (best effort)
        const eventId = (data as { id: string }).id;
        const templateId = templateData?.id;
        if (templateId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("events") as any).update({ template_id: templateId }).eq("id", eventId);
        }
      }

      clearSaved();
      toast({ title: t("event_created") });
      if (onCreated) {
        onCreated(data.id);
      } else {
        navigate("/");
      }
    } catch {
      toast({ title: t("common:error"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t("event_title")}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <EventFormFields
        format={format}
        onFormatChange={setFormat}
        city={city}
        onCityChange={setCity}
        startsAt={startsAt}
        onStartsAtChange={setStartsAt}
        minPlayers={minPlayers}
        onMinPlayersChange={setMinPlayers}
      />

      <div className="space-y-2">
        <Label>{t("venue")}</Label>
        <Select
          value={venueId || "none"}
          onValueChange={(v) => setVenueId(v === "none" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("select_venue")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">--</SelectItem>
            {venues?.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name} ({v.city})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_players">{t("max_players")}</Label>
        <Input
          id="max_players"
          type="number"
          min={2}
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fee">{t("fee")}</Label>
        <Input
          id="fee"
          value={feeText}
          onChange={(e) => setFeeText(e.target.value)}
        />
      </div>

      {/* Mood Tags */}
      <MoodTagSelector value={moodTags} onChange={setMoodTags} />

      {/* Proxy Policy */}
      <ProxyPolicySelector value={proxyPolicy} onChange={setProxyPolicy} />

      <div className="space-y-2">
        <Label htmlFor="description">{t("description")}</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="flex w-full rounded-md border border-gray-600 bg-primary px-4 py-3 text-base text-gray-100 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        />
      </div>

      {/* Recurring events */}
      <RecurrencePicker value={recurrence} onChange={setRecurrence} />

      <Button type="submit" className="w-full min-h-[44px]" disabled={isCreating || isSubmitting}>
        {isCreating || isSubmitting ? t("common:loading") : t("create_big_event")}
      </Button>
    </form>
  );
}
