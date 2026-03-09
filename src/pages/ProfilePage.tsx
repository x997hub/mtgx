import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useInvitePreferences } from "@/hooks/useInvitePreferences";
import { InvitePlayerDialog } from "@/components/players/InvitePlayerDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { CityBadge } from "@/components/shared/CityBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { DAYS, SLOTS } from "@/lib/constants";
import type { DayOfWeek, TimeSlot, AvailabilityLevel, Availability, UserRole } from "@/types/database.types";
import { getInitials } from "@/lib/utils";
import { OrganizerStatsCard } from "@/components/profile/OrganizerStatsCard";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { Car, MessageCircle, Pencil, Repeat, Shield, Bell, UserPlus, Trash2 } from "lucide-react";

const AVAIL_COLORS: Record<AvailabilityLevel, string> = {
  available: "bg-emerald-600",
  sometimes: "bg-amber-600",
  unavailable: "bg-surface-hover",
};

function AvailabilityGrid({ availability }: { availability: Availability[] }) {
  const { t } = useTranslation("profile");

  function getLevel(day: DayOfWeek, slot: TimeSlot): AvailabilityLevel {
    const entry = availability.find((a) => a.day === day && a.slot === slot);
    return entry?.level ?? "unavailable";
  }

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="min-w-[320px] w-full text-sm">
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
                const level = getLevel(day, slot);
                return (
                  <td key={day} className="p-1 text-center">
                    <div
                      className={`mx-auto h-6 w-6 rounded ${AVAIL_COLORS[level]}`}
                      title={t(level)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
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
  );
}

const ROLE_LABELS: Record<string, string> = {
  player: "role_player",
  organizer: "role_organizer",
  club_owner: "role_club_owner",
  admin: "role_admin",
};

const RELIABILITY_VIEWER_ROLES: UserRole[] = ["organizer", "club_owner", "admin"];

export default function ProfilePage() {
  const { t } = useTranslation("profile");
  const { t: tc } = useTranslation("common");
  const { t: te } = useTranslation("events");
  const { userId } = useParams<{ userId?: string }>();
  const { user, profile: viewerProfile } = useAuth();
  const queryClient = useQueryClient();
  const isOwn = !userId || userId === user?.id;
  const { profile, availability, isLoading } = useProfile(isOwn ? undefined : userId);
  const { subscriptions } = useSubscription();
  const { prefs: invitePrefs } = useInvitePreferences(isOwn ? undefined : userId);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const canInvite = !isOwn && invitePrefs?.is_open &&
    (!invitePrefs.dnd_until || new Date(invitePrefs.dnd_until) <= new Date());

  // Recurring events (own profile only, organizer/club_owner/admin)
  const { data: templates } = useQuery({
    queryKey: ["event-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_templates")
        .select("*")
        .eq("organizer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isOwn && !!user,
  });

  const toggleTemplateMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("event_templates")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-templates", user?.id] });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("event_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-templates", user?.id] });
      toast({ title: tc("deleted", "Deleted") });
    },
  });

  // Reliability score is visible to organizers, club_owners, and admins
  const canSeeReliability =
    viewerProfile != null &&
    RELIABILITY_VIEWER_ROLES.includes(viewerProfile.role);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface p-4 space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-surface p-4">
        <EmptyState title={tc("no_results")} />
      </div>
    );
  }

  const initials = getInitials(profile.display_name);

  const avatarUrl = profile.avatar_url;
  const whatsappUrl = profile.whatsapp
    ? `https://wa.me/${encodeURIComponent(profile.whatsapp.replace(/[\s\-()+ ]/g, ""))}`
    : null;

  const CAR_LABELS: Record<string, string> = {
    yes: "car_yes",
    no: "car_no",
    sometimes: "car_sometimes",
  };

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      <div className="mx-auto max-w-lg space-y-4 p-4">
        {/* Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={profile.display_name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <AvatarFallback className="text-base">{initials}</AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-text-primary truncate">{profile.display_name}</h1>
                  <p className="text-sm text-text-secondary">{profile.city}</p>
                </div>
              </div>
              {isOwn && (
                <Button variant="ghost" size="icon" asChild aria-label={t("edit_profile")} className="shrink-0">
                  <Link to="/profile/edit">
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CityBadge city={profile.city} />
              <Badge variant="outline" className="text-text-secondary">
                {t(ROLE_LABELS[profile.role] ?? "role_player")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        {profile.bio && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-text-secondary">{t("bio")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base text-text-primary whitespace-pre-line">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* WhatsApp */}
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Card className="hover:border-emerald-500/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <MessageCircle className="h-5 w-5 text-emerald-400" />
                <span className="text-base font-medium text-emerald-400">{t("whatsapp_chat")}</span>
              </CardContent>
            </Card>
          </a>
        )}

        {/* Invite to Play */}
        {canInvite && (
          <>
            <Button
              className="w-full min-h-[44px]"
              onClick={() => setShowInviteDialog(true)}
            >
              <UserPlus className="me-2 h-4 w-4" />
              {t("invite_to_play")}
            </Button>
            <InvitePlayerDialog
              open={showInviteDialog}
              onOpenChange={setShowInviteDialog}
              targetUserId={userId!}
              targetDisplayName={profile.display_name}
            />
          </>
        )}

        {/* Car Access & Trading */}
        {(profile.car_access || profile.interested_in_trading) && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              {profile.car_access && (
                <div className="flex items-center gap-2 text-base text-text-secondary">
                  <Car className="h-5 w-5 text-text-secondary" />
                  {t(CAR_LABELS[profile.car_access] ?? "car_no")}
                </div>
              )}
              {profile.interested_in_trading && (
                <div className="flex items-center gap-2 text-base text-text-secondary">
                  <Repeat className="h-5 w-5 text-text-secondary" />
                  {t("interested_in_trading")}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reliability score (visible to organizers/admins) */}
        {canSeeReliability && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Shield className="h-5 w-5 text-accent" />
              <div>
                <p className="text-base text-text-secondary">{t("reliability_score")}</p>
                <p className="text-lg font-semibold text-text-primary">
                  {((profile.reliability_score ?? 1) * 100).toFixed(0)}%
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organizer Stats — only on other users' profiles */}
        {!isOwn && (profile.role === "organizer" || profile.role === "club_owner") && (
          <OrganizerStatsCard organizerId={profile.id} />
        )}

        {/* Game Style */}
        {(profile.playstyle || profile.game_speed || profile.social_level) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-text-secondary">{t("game_style")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.playstyle && profile.playstyle !== "mixed" && (
                  <Badge variant="outline">{t(profile.playstyle)}</Badge>
                )}
                {profile.playstyle === "mixed" && (
                  <Badge variant="outline">{t("mixed")}</Badge>
                )}
                {profile.game_speed && (
                  <Badge variant="outline">{t(profile.game_speed)}</Badge>
                )}
                {profile.social_level && (
                  <Badge variant="outline">{t(profile.social_level)}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formats */}
        {profile.formats.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-text-secondary">{t("formats")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.formats.map((format) => (
                  <FormatBadge key={format} format={format} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Availability */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-text-secondary">{t("availability")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityGrid availability={availability} />
          </CardContent>
        </Card>

        {/* Recurring Events (own profile only) */}
        {isOwn && templates && templates.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-text-secondary">
                <Repeat className="h-4 w-4" />
                {te("my_recurring_events", "My recurring events")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates.map((tmpl) => {
                const data = tmpl.template_data as Record<string, unknown>;
                return (
                  <div
                    key={tmpl.id}
                    className="flex items-center justify-between rounded-lg bg-primary px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-text-primary truncate">
                        {(data.title as string) || (data.format as string) || te("recurring")}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {tmpl.recurrence_rule}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tmpl.is_active}
                          onChange={() => toggleTemplateMutation.mutate({
                            id: tmpl.id,
                            is_active: !tmpl.is_active,
                          })}
                          className="h-4 w-4 rounded border-border bg-border text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-text-secondary">
                          {tmpl.is_active ? tc("active", "Active") : tc("inactive", "Inactive")}
                        </span>
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTemplateMutation.mutate(tmpl.id)}
                        className="text-text-secondary hover:text-danger min-h-[36px] min-w-[36px] p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Subscriptions (own profile only) */}
        {isOwn && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-text-secondary">
                <Bell className="h-4 w-4" />
                {t("subscriptions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-base text-text-muted">{t("no_subscriptions")}</p>
              ) : (
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-lg bg-primary px-3 py-2 text-base"
                    >
                      <span className="text-text-primary">
                        {sub.target_type}
                        {sub.format && ` / ${sub.format}`}
                        {sub.city && ` / ${sub.city}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit button */}
        {isOwn && (
          <Button className="w-full" asChild>
            <Link to="/profile/edit">
              <Pencil className="me-2 h-4 w-4" />
              {t("edit_profile")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
