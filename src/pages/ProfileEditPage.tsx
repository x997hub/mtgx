import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FORMATS, CITIES, DAYS, SLOTS, CAR_ACCESS_OPTIONS } from "@/lib/constants";
import type {
  MtgFormat,
  DayOfWeek,
  TimeSlot,
  AvailabilityLevel,
  AvailabilityInsert,
  CarAccess,
  Playstyle,
  GameSpeed,
  SocialLevel,
} from "@/types/database.types";
import { Camera, Car, Gamepad2, Loader2, Repeat, Save } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useFormatToggle } from "@/hooks/useFormatToggle";
import { AutoMatchSettings } from "@/components/profile/AutoMatchSettings";
import { InvitePreferencesSettings } from "@/components/profile/InvitePreferencesSettings";

const AVATARS_BUCKET = "avatars";

const LEVELS: AvailabilityLevel[] = ["available", "sometimes", "unavailable"];

import { FORMAT_TOGGLE_COLORS as FORMAT_COLORS, AVAILABILITY_LEVEL_COLORS as LEVEL_COLORS } from "@/lib/constants";

export default function ProfileEditPage() {
  const { t } = useTranslation("profile");
  const { t: tc } = useTranslation("common");
  const { t: te } = useTranslation("events");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, availability, isLoading, updateProfile, updateAvailability, isUpdating } =
    useProfile();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [formats, setFormats] = useState<MtgFormat[]>([]);
  const [whatsapp, setWhatsapp] = useState("");
  const [arenaUsername, setArenaUsername] = useState("");
  const [bio, setBio] = useState("");
  const [carAccess, setCarAccess] = useState<CarAccess | "">("");
  const [interestedInTrading, setInterestedInTrading] = useState(false);
  const [playstyle, setPlaystyle] = useState<Playstyle>("mixed");
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>("medium");
  const [socialLevel, setSocialLevel] = useState<SocialLevel>("moderate");
  const [grid, setGrid] = useState<Record<string, AvailabilityLevel>>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setCity(profile.city);
      setFormats(profile.formats);
      setWhatsapp(profile.whatsapp ?? "");
      setArenaUsername(profile.arena_username ?? "");
      setBio(profile.bio ?? "");
      setCarAccess((profile.car_access as CarAccess) ?? "");
      setInterestedInTrading(profile.interested_in_trading ?? false);
      setPlaystyle((profile.playstyle as Playstyle) ?? "mixed");
      setGameSpeed((profile.game_speed as GameSpeed) ?? "medium");
      setSocialLevel((profile.social_level as SocialLevel) ?? "moderate");
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  useEffect(() => {
    if (availability.length > 0) {
      const map: Record<string, AvailabilityLevel> = {};
      for (const a of availability) {
        map[`${a.day}-${a.slot}`] = a.level;
      }
      setGrid(map);
    }
  }, [availability]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const onFormatsChange = useCallback((fmts: MtgFormat[]) => setFormats(fmts), []);
  const toggleFormat = useFormatToggle(formats, onFormatsChange);

  async function handleAvatarUpload(file: File) {
    if (!user || isUploading) return;
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      // Delete old avatar from storage if it's ours (not a Google URL)
      if (avatarUrl && avatarUrl.includes(`/storage/v1/object/public/${AVATARS_BUCKET}/`)) {
        const oldPath = avatarUrl.split(`/storage/v1/object/public/${AVATARS_BUCKET}/`)[1];
        if (oldPath) {
          await supabase.storage.from(AVATARS_BUCKET).remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(AVATARS_BUCKET)
        .getPublicUrl(path);

      setAvatarUrl(urlData.publicUrl);
      // Use local blob URL for preview to avoid CSP issues with cached headers
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(URL.createObjectURL(file));
      toast({ title: t("photo_uploaded") });
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }

  function cycleLevel(day: DayOfWeek, slot: TimeSlot) {
    const key = `${day}-${slot}`;
    const current = grid[key] ?? "unavailable";
    const idx = LEVELS.indexOf(current);
    const next = LEVELS[(idx + 1) % LEVELS.length];
    setGrid((prev) => ({ ...prev, [key]: next }));
  }

  async function handleSave() {
    if (!user) return;

    // Validate WhatsApp number format
    if (whatsapp && !/^\+?\d{7,15}$/.test(whatsapp.replace(/[\s\-()]/g, ""))) {
      toast({ title: t("invalid_phone"), variant: "destructive" });
      return;
    }

    try {
      await updateProfile({
        display_name: displayName.trim(),
        city,
        formats,
        whatsapp: whatsapp || null,
        arena_username: arenaUsername.trim() || null,
        bio: bio.trim() || null,
        car_access: carAccess || null,
        interested_in_trading: interestedInTrading,
        playstyle,
        game_speed: gameSpeed,
        social_level: socialLevel,
        avatar_url: avatarUrl,
      });

      const slots: AvailabilityInsert[] = [];
      for (const day of DAYS) {
        for (const slot of SLOTS) {
          const level = grid[`${day}-${slot}`] ?? "unavailable";
          slots.push({ user_id: user.id, day, slot, level });
        }
      }
      await updateAvailability(slots);

      toast({ title: t("profile_saved") });
      navigate("/profile");
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface p-4 space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <h1 className="text-2xl font-bold text-text-primary">{t("edit_profile")}</h1>

        {/* Avatar & Display Name */}
        <Card>
          <CardContent className="space-y-3 p-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  {(avatarPreview || avatarUrl) ? (
                    <AvatarImage src={avatarPreview ?? avatarUrl!} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="text-lg">
                    {getInitials(displayName || "?")}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-1 -end-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white shadow-md transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
              <p className="text-sm text-text-muted">{t("change_photo")}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="displayName">{t("display_name")}</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label>{t("city")}</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue placeholder={t("select_city")} />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
              <Input
                id="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder={t("whatsapp_placeholder")}
              />
            </div>

            {/* Arena Username */}
            <div className="space-y-1.5">
              <Label htmlFor="arena_username">{t("arena_username")}</Label>
              <Input
                id="arena_username"
                value={arenaUsername}
                onChange={(e) => setArenaUsername(e.target.value)}
                placeholder={t("arena_username_placeholder")}
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="bio">{t("bio")}</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t("bio_placeholder")}
                rows={3}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Car Access */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-text-secondary">
              <Car className="h-4 w-4" />
              {t("car_access")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {CAR_ACCESS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCarAccess(carAccess === option ? "" : option)}
                  className={`rounded-full px-5 py-2 text-base font-medium transition-colors ${
                    carAccess === option
                      ? "bg-accent text-white"
                      : "bg-surface-hover text-text-secondary"
                  }`}
                >
                  {t(`car_${option}`)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Interested in Trading */}
        <Card>
          <CardContent className="p-4">
            <button
              type="button"
              onClick={() => setInterestedInTrading(!interestedInTrading)}
              className="flex w-full items-center gap-3"
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
                  interestedInTrading
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-transparent"
                }`}
              >
                {interestedInTrading && <Repeat className="h-4 w-4" />}
              </div>
              <span className="text-base text-text-primary">{t("interested_in_trading")}</span>
            </button>
          </CardContent>
        </Card>

        {/* Formats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-text-secondary">{t("formats")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((format) => {
                const active = formats.includes(format);
                const colors = FORMAT_COLORS[format];
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
          </CardContent>
        </Card>

        {/* Availability Grid */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-text-secondary">{t("availability")}</CardTitle>
            <p className="text-sm text-text-muted">{t("availability_description")}</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr>
                    <th className="p-1 text-start text-text-secondary" />
                    {DAYS.map((day) => (
                      <th key={day} className="p-1 text-center text-text-secondary font-normal">
                        {t(day)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLOTS.map((slot) => (
                    <tr key={slot}>
                      <td className="p-1 text-text-secondary whitespace-nowrap">
                        {t(`${slot}_slot`)}
                      </td>
                      {DAYS.map((day) => {
                        const key = `${day}-${slot}`;
                        const level = grid[key] ?? "unavailable";
                        return (
                          <td key={day} className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() => cycleLevel(day, slot)}
                              className={`mx-auto h-10 w-10 rounded transition-colors ${LEVEL_COLORS[level]}`}
                              title={t(level)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex items-center gap-3 text-sm text-text-secondary">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-4 w-4 rounded bg-emerald-600" /> {t("available")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-4 w-4 rounded bg-amber-600" /> {t("sometimes")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-4 w-4 rounded bg-surface-hover" /> {t("unavailable")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Style */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-text-secondary">
              <Gamepad2 className="h-4 w-4" />
              {t("game_style")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Playstyle */}
            <div className="space-y-1.5">
              <Label>{t("playstyle")}</Label>
              <div className="flex flex-wrap gap-2">
                {(["casual", "mixed", "competitive"] as Playstyle[]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPlaystyle(val)}
                    className={cn(
                      "rounded-full px-5 py-2 text-base font-medium transition-colors",
                      playstyle === val
                        ? "bg-accent text-white"
                        : "bg-surface-card border border-border text-text-secondary"
                    )}
                  >
                    {t(val)}
                  </button>
                ))}
              </div>
            </div>

            {/* Game Speed */}
            <div className="space-y-1.5">
              <Label>{t("game_speed")}</Label>
              <div className="flex flex-wrap gap-2">
                {(["slow", "medium", "fast"] as GameSpeed[]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setGameSpeed(val)}
                    className={cn(
                      "rounded-full px-5 py-2 text-base font-medium transition-colors",
                      gameSpeed === val
                        ? "bg-accent text-white"
                        : "bg-surface-card border border-border text-text-secondary"
                    )}
                  >
                    {t(val)}
                  </button>
                ))}
              </div>
            </div>

            {/* Social Level */}
            <div className="space-y-1.5">
              <Label>{t("social_level")}</Label>
              <div className="flex flex-wrap gap-2">
                {(["quiet", "moderate", "talkative"] as SocialLevel[]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSocialLevel(val)}
                    className={cn(
                      "rounded-full px-5 py-2 text-base font-medium transition-colors",
                      socialLevel === val
                        ? "bg-accent text-white"
                        : "bg-surface-card border border-border text-text-secondary"
                    )}
                  >
                    {t(val)}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto-Match Settings */}
        <AutoMatchSettings />

        {/* Invite Preferences */}
        <InvitePreferencesSettings />

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/profile")}
          >
            {tc("cancel")}
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isUpdating || !displayName.trim() || !city}
          >
            {isUpdating ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            {tc("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
