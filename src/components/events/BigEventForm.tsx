import { useState } from "react";
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
import type { MtgFormat } from "@/types/database.types";

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
}

export function BigEventForm({ defaultValues, clonedFrom }: BigEventFormProps) {
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
    if (!user) return;
    if (!city) {
      toast({ title: t("city_required", "City is required"), variant: "destructive" });
      return;
    }

    try {
      await createEvent({
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

      <div className="space-y-2">
        <Label htmlFor="description">{t("description")}</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="flex w-full rounded-md border border-gray-600 bg-primary px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        />
      </div>

      <Button type="submit" className="w-full min-h-[44px]" disabled={isCreating}>
        {isCreating ? t("common:loading") : t("create_big_event")}
      </Button>
    </form>
  );
}
