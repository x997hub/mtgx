import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
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
import { Car, MessageCircle, Pencil, Repeat, Shield, Bell, UserPlus } from "lucide-react";

const LEVEL_COLORS: Record<AvailabilityLevel, string> = {
  available: "bg-emerald-600",
  sometimes: "bg-amber-600",
  unavailable: "bg-gray-700",
};

function AvailabilityGrid({ availability }: { availability: Availability[] }) {
  const { t } = useTranslation("profile");

  function getLevel(day: DayOfWeek, slot: TimeSlot): AvailabilityLevel {
    const entry = availability.find((a) => a.day === day && a.slot === slot);
    return entry?.level ?? "unavailable";
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base">
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
                const level = getLevel(day, slot);
                return (
                  <td key={day} className="p-1 text-center">
                    <div
                      className={`mx-auto h-8 w-8 rounded ${LEVEL_COLORS[level]}`}
                      title={t(level)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-3 text-sm text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-4 w-4 rounded bg-emerald-600" /> {t("available")}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-4 w-4 rounded bg-amber-600" /> {t("sometimes")}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-4 w-4 rounded bg-gray-700" /> {t("unavailable")}
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
  const { userId } = useParams<{ userId?: string }>();
  const { user, profile: viewerProfile } = useAuth();
  const isOwn = !userId || userId === user?.id;
  const { profile, availability, isLoading } = useProfile(isOwn ? undefined : userId);
  const { subscriptions } = useSubscription();
  const { prefs: invitePrefs } = useInvitePreferences(isOwn ? undefined : userId);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const canInvite = !isOwn && invitePrefs?.is_open &&
    (!invitePrefs.dnd_until || new Date(invitePrefs.dnd_until) <= new Date());

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

  const initials = profile.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarUrl = profile.avatar_url;
  const whatsappUrl = profile.whatsapp
    ? `https://wa.me/${profile.whatsapp.replace(/[\s\-()+ ]/g, "")}`
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
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={profile.display_name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 space-y-1">
                <h1 className="text-2xl font-bold text-gray-100">{profile.display_name}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <CityBadge city={profile.city} />
                  <Badge variant="outline" className="text-gray-300">
                    {t(ROLE_LABELS[profile.role] ?? "role_player")}
                  </Badge>
                </div>
              </div>
              {isOwn && (
                <Button variant="ghost" size="icon" asChild aria-label={t("edit_profile")}>
                  <Link to="/profile/edit">
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        {profile.bio && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-400">{t("bio")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base text-gray-200 whitespace-pre-line">{profile.bio}</p>
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
              <UserPlus className="mr-2 h-4 w-4" />
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
            <CardContent className="flex flex-wrap gap-3 p-4">
              {profile.car_access && (
                <div className="flex items-center gap-2 text-base text-gray-300">
                  <Car className="h-5 w-5 text-gray-400" />
                  {t(CAR_LABELS[profile.car_access] ?? "car_no")}
                </div>
              )}
              {profile.interested_in_trading && (
                <div className="flex items-center gap-2 text-base text-gray-300">
                  <Repeat className="h-5 w-5 text-gray-400" />
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
                <p className="text-base text-gray-400">{t("reliability_score")}</p>
                <p className="text-lg font-semibold text-gray-100">
                  {((profile.reliability_score ?? 1) * 100).toFixed(0)}%
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formats */}
        {profile.formats.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-400">{t("formats")}</CardTitle>
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
            <CardTitle className="text-base text-gray-400">{t("availability")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityGrid availability={availability} />
          </CardContent>
        </Card>

        {/* Subscriptions (own profile only) */}
        {isOwn && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-gray-400">
                <Bell className="h-4 w-4" />
                {t("subscriptions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-base text-gray-500">{t("no_subscriptions")}</p>
              ) : (
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-lg bg-primary px-3 py-2 text-base"
                    >
                      <span className="text-gray-200">
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
              <Pencil className="mr-2 h-4 w-4" />
              {t("edit_profile")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
