import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { FORMATS, CITIES, DAYS, SLOTS, CAR_ACCESS_OPTIONS } from "@/lib/constants";
import type {
  MtgFormat,
  DayOfWeek,
  TimeSlot,
  AvailabilityLevel,
  AvailabilityInsert,
  CarAccess,
} from "@/types/database.types";
import { Car, Loader2, Repeat, Save } from "lucide-react";

const LEVELS: AvailabilityLevel[] = ["available", "sometimes", "unavailable"];

const LEVEL_COLORS: Record<AvailabilityLevel, string> = {
  available: "bg-emerald-600 hover:bg-emerald-500",
  sometimes: "bg-amber-600 hover:bg-amber-500",
  unavailable: "bg-gray-700 hover:bg-gray-600",
};

const FORMAT_COLORS: Record<MtgFormat, { active: string; inactive: string }> = {
  pauper: { active: "bg-emerald-700 text-emerald-100", inactive: "bg-gray-700 text-gray-400" },
  commander: { active: "bg-purple-700 text-purple-100", inactive: "bg-gray-700 text-gray-400" },
  standard: { active: "bg-blue-700 text-blue-100", inactive: "bg-gray-700 text-gray-400" },
  draft: { active: "bg-amber-700 text-amber-100", inactive: "bg-gray-700 text-gray-400" },
};

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
  const [bio, setBio] = useState("");
  const [carAccess, setCarAccess] = useState<CarAccess | "">("");
  const [interestedInTrading, setInterestedInTrading] = useState(false);
  const [grid, setGrid] = useState<Record<string, AvailabilityLevel>>({});

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setCity(profile.city);
      setFormats(profile.formats);
      setWhatsapp(profile.whatsapp ?? "");
      setBio(profile.bio ?? "");
      setCarAccess(profile.car_access ?? "");
      setInterestedInTrading(profile.interested_in_trading ?? false);
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

  function toggleFormat(format: MtgFormat) {
    setFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
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
        bio: bio.trim() || null,
        car_access: carAccess || null,
        interested_in_trading: interestedInTrading,
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
        <h1 className="text-2xl font-bold text-gray-100">{t("edit_profile")}</h1>

        {/* Display Name */}
        <Card>
          <CardContent className="space-y-3 p-4">
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
            <CardTitle className="flex items-center gap-2 text-sm text-gray-400">
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
                      : "bg-gray-700 text-gray-400"
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
                    : "border-gray-600 bg-transparent"
                }`}
              >
                {interestedInTrading && <Repeat className="h-4 w-4" />}
              </div>
              <span className="text-base text-gray-200">{t("interested_in_trading")}</span>
            </button>
          </CardContent>
        </Card>

        {/* Formats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-400">{t("formats")}</CardTitle>
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
            <CardTitle className="text-base text-gray-400">{t("availability")}</CardTitle>
            <p className="text-xs text-gray-500">{t("availability_description")}</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-1 text-left text-gray-400" />
                    {DAYS.map((day) => (
                      <th key={day} className="p-1 text-center text-gray-400 font-normal">
                        {t(day)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLOTS.map((slot) => (
                    <tr key={slot}>
                      <td className="p-1 text-gray-400 whitespace-nowrap">
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
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-emerald-600" /> {t("available")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-amber-600" /> {t("sometimes")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-gray-700" /> {t("unavailable")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {tc("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
