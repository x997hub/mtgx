import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { FORMATS, CITIES, FORMAT_TOGGLE_COLORS } from "@/lib/constants";
import { useFormatToggle } from "@/hooks/useFormatToggle";
import { cn } from "@/lib/utils";
import { ImagePlus, Loader2, MapPin, Plus, Save, Star, Trash2, X } from "lucide-react";
import type { MtgFormat, Venue, VenuePhoto } from "@/types/database.types";

const VENUE_IMAGES_BUCKET = "venue-images";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

interface HoursEntry {
  open: boolean;
  from: string;
  to: string;
}

interface ContactEntry {
  label: string;
  value: string;
}

export default function VenueManagePage() {
  const { t } = useTranslation("venue");
  const { t: tc } = useTranslation("common");
  const { t: te } = useTranslation("events");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: venueId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isEdit = !!venueId;

  // Form state
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [formats, setFormats] = useState<MtgFormat[]>([]);
  const [capacity, setCapacity] = useState<number | "">("");
  const [hours, setHours] = useState<HoursEntry[]>(
    WEEKDAYS.map(() => ({ open: false, from: "10:00", to: "22:00" }))
  );
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onFormatsChange = useCallback((fmts: MtgFormat[]) => setFormats(fmts), []);
  const toggleFormat = useFormatToggle(formats, onFormatsChange);

  // Load venue in edit mode
  const venueQuery = useQuery({
    queryKey: ["venue", venueId],
    queryFn: async () => {
      if (!venueId) return null;
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", venueId)
        .maybeSingle();
      if (error) throw error;
      return data as Venue;
    },
    enabled: isEdit,
  });

  // Photos (edit mode only)
  const photosQuery = useQuery({
    queryKey: ["venue-photos", venueId],
    queryFn: async () => {
      if (!venueId) return [];
      const { data, error } = await supabase
        .from("venue_photos")
        .select("*")
        .eq("venue_id", venueId)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data as VenuePhoto[];
    },
    enabled: isEdit,
  });

  // Populate form from venue data
  useEffect(() => {
    const venue = venueQuery.data;
    if (!venue) return;
    setName(venue.name);
    setCity(venue.city);
    setAddress(venue.address);
    setFormats(venue.supported_formats ?? []);
    setCapacity(venue.capacity ?? "");
    setLatitude(venue.latitude ?? "");
    setLongitude(venue.longitude ?? "");

    // Parse hours JSON
    if (venue.hours && typeof venue.hours === "object") {
      const h = venue.hours as Record<string, string>;
      setHours(
        WEEKDAYS.map((day) => {
          const val = h[day];
          if (!val || val === "closed") return { open: false, from: "10:00", to: "22:00" };
          const [from, to] = val.split("-");
          return { open: true, from: from ?? "10:00", to: to ?? "22:00" };
        })
      );
    }

    // Parse contacts JSON
    if (venue.contacts && typeof venue.contacts === "object") {
      const c = venue.contacts as Record<string, string>;
      setContacts(Object.entries(c).map(([label, value]) => ({ label, value })));
    }
  }, [venueQuery.data]);

  // Permission check
  const canManage = isEdit
    ? venueQuery.data && user && (venueQuery.data.owner_id === user.id || profile?.role === "admin")
    : profile?.role === "club_owner" || profile?.role === "admin";

  if (isEdit && venueQuery.isLoading) {
    return (
      <div className="min-h-screen bg-surface p-4 space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isEdit && venueQuery.data && !canManage) {
    navigate(`/venues/${venueId}`, { replace: true });
    return null;
  }

  if (!isEdit && !canManage) {
    navigate("/clubs", { replace: true });
    return null;
  }

  async function handleSave() {
    if (!user || isSaving) return;
    if (!name.trim() || !city || !address.trim()) {
      toast({ title: tc("error"), variant: "destructive" });
      return;
    }

    setIsSaving(true);

    // Build hours JSON
    const hoursJson: Record<string, string> = {};
    WEEKDAYS.forEach((day, i) => {
      const entry = hours[i];
      hoursJson[day] = entry.open ? `${entry.from}-${entry.to}` : "closed";
    });

    // Build contacts JSON
    const contactsJson: Record<string, string> = {};
    contacts.forEach((c) => {
      if (c.label.trim() && c.value.trim()) {
        contactsJson[c.label.trim()] = c.value.trim();
      }
    });

    const payload = {
      name: name.trim(),
      city,
      address: address.trim(),
      supported_formats: formats,
      capacity: capacity === "" ? null : Number(capacity),
      hours: hoursJson,
      contacts: Object.keys(contactsJson).length > 0 ? contactsJson : null,
      latitude: latitude === "" ? null : Number(latitude),
      longitude: longitude === "" ? null : Number(longitude),
    };

    try {
      if (isEdit && venueId) {
        const { error } = await supabase
          .from("venues")
          .update(payload)
          .eq("id", venueId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["venue", venueId] });
        queryClient.invalidateQueries({ queryKey: ["venues"] });
        toast({ title: t("venue_saved") });
        navigate(`/venues/${venueId}`);
      } else {
        const { data, error } = await supabase
          .from("venues")
          .insert({ ...payload, owner_id: user.id })
          .select("id")
          .single();
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["venues"] });
        toast({ title: t("venue_created") });
        navigate(`/venues/${data.id}`);
      }
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!venueId || isDeleting) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("venues").delete().eq("id", venueId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      toast({ title: t("venue_deleted") });
      navigate("/clubs");
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    if (!venueId || isUploading) return;
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${venueId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(VENUE_IMAGES_BUCKET)
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("venue_photos")
        .insert({ venue_id: venueId, storage_path: path, is_primary: false });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["venue-photos", venueId] });
      toast({ title: t("photo_uploaded") });
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSetPrimary(photoId: string) {
    if (!venueId) return;
    // Unset all, then set the chosen one
    await supabase.from("venue_photos").update({ is_primary: false }).eq("venue_id", venueId);
    await supabase.from("venue_photos").update({ is_primary: true }).eq("id", photoId);
    queryClient.invalidateQueries({ queryKey: ["venue-photos", venueId] });
  }

  async function handleDeletePhoto(photoId: string, storagePath: string) {
    await supabase.storage.from(VENUE_IMAGES_BUCKET).remove([storagePath]);
    await supabase.from("venue_photos").delete().eq("id", photoId);
    queryClient.invalidateQueries({ queryKey: ["venue-photos", venueId] });
    toast({ title: t("photo_deleted") });
  }

  function updateHour(idx: number, patch: Partial<HoursEntry>) {
    setHours((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }

  function addContact() {
    setContacts((prev) => [...prev, { label: "", value: "" }]);
  }

  function updateContact(idx: number, patch: Partial<ContactEntry>) {
    setContacts((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function removeContact(idx: number) {
    setContacts((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <h1 className="text-2xl font-bold">
          {isEdit ? t("edit_venue") : t("create_venue")}
        </h1>

        {/* Basic Info */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="venue-name">{t("venue_name")}</Label>
              <Input
                id="venue-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("address")}</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>{tc("city")}</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue placeholder={tc("select")} />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("capacity")}</Label>
              <Input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Formats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-text-secondary">{t("supported_formats")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((format) => {
                const active = formats.includes(format);
                const colors = FORMAT_TOGGLE_COLORS[format];
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

        {/* Working Hours */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-text-secondary">{t("hours")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {WEEKDAYS.map((day, idx) => (
              <div key={day} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateHour(idx, { open: !hours[idx].open })}
                  className={cn(
                    "w-20 shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors text-center",
                    hours[idx].open
                      ? "bg-success text-white"
                      : "bg-surface-hover text-text-secondary"
                  )}
                >
                  {hours[idx].open ? t(`day_${day}`).slice(0, 3) : t("closed")}
                </button>
                {hours[idx].open && (
                  <>
                    <Input
                      type="time"
                      value={hours[idx].from}
                      onChange={(e) => updateHour(idx, { from: e.target.value })}
                      className="w-28"
                    />
                    <span className="text-text-secondary">–</span>
                    <Input
                      type="time"
                      value={hours[idx].to}
                      onChange={(e) => updateHour(idx, { to: e.target.value })}
                      className="w-28"
                    />
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-text-secondary">{t("contacts")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.map((c, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder={t("contact_label")}
                  value={c.label}
                  onChange={(e) => updateContact(idx, { label: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder={t("contact_value")}
                  value={c.value}
                  onChange={(e) => updateContact(idx, { value: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeContact(idx)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addContact}>
              <Plus className="me-1 h-4 w-4" />
              {t("add_contact")}
            </Button>
          </CardContent>
        </Card>

        {/* Coordinates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-text-secondary">
              <MapPin className="h-4 w-4" />
              {t("coordinates")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <Label>{t("latitude")}</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="32.0853"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>{t("longitude")}</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="34.7818"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos (edit mode only) */}
        {isEdit && venueId && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-text-secondary">{t("photos")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {photosQuery.data && photosQuery.data.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {photosQuery.data.map((photo) => {
                    const url = supabase.storage
                      .from(VENUE_IMAGES_BUCKET)
                      .getPublicUrl(photo.storage_path).data.publicUrl;
                    return (
                      <div key={photo.id} className="relative group rounded-lg overflow-hidden">
                        <img
                          src={url}
                          alt=""
                          className="aspect-video w-full object-cover"
                        />
                        {photo.is_primary && (
                          <div className="absolute top-1 left-1 rounded bg-accent px-1.5 py-0.5 text-xs text-white">
                            <Star className="h-3 w-3 inline me-0.5" />
                            Primary
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!photo.is_primary && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-white text-xs h-7"
                              onClick={() => handleSetPrimary(photo.id)}
                            >
                              <Star className="h-3 w-3 me-1" />
                              {t("set_primary")}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 text-xs h-7 ms-auto"
                            onClick={() => handleDeletePhoto(photo.id, photo.storage_path)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="me-2 h-4 w-4" />
                )}
                {t("upload_photo")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(isEdit ? `/venues/${venueId}` : "/clubs")}
          >
            {tc("cancel")}
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !city || !address.trim()}
          >
            {isSaving ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            {tc("save")}
          </Button>
        </div>

        {/* Delete (edit mode only) */}
        {isEdit && canManage && (
          <Card className="border-danger/30">
            <CardContent className="p-4">
              {showDeleteConfirm ? (
                <div className="space-y-3">
                  <p className="text-base text-text-primary">{t("delete_venue_confirm")}</p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      {tc("cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                      {t("delete_venue")}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full text-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  {t("delete_venue")}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
