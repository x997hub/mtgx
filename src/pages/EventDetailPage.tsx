import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users, Clock, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { CircularProgress } from "@/components/shared/CircularProgress";
import { WhatsAppShareButton } from "@/components/shared/WhatsAppShareButton";
import { ShareButton } from "@/components/events/ShareButton";
import { MoodTagBadge } from "@/components/events/MoodTagBadge";
import { ProxyPolicyBadge } from "@/components/events/ProxyPolicyBadge";
import { RecurringBadge } from "@/components/events/RecurringBadge";
import { RSVPButton } from "@/components/events/RSVPButton";
import { AttendeeList } from "@/components/events/AttendeeList";
import { MessageComposer } from "@/components/events/MessageComposer";
import { OrganizerMessagesList } from "@/components/events/OrganizerMessagesList";
import { useEvent, useEventRsvps } from "@/hooks/useEvents";
import { useWaitlist } from "@/hooks/useWaitlist";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import type { RsvpStatus } from "@/types/database.types";

export default function EventDetailPage() {
  const { t } = useTranslation(["events", "common"]);
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);

  const { data: event, isLoading: eventLoading } = useEvent(eventId ?? "");
  const { data: rsvps, isLoading: rsvpsLoading } = useEventRsvps(eventId ?? "");
  const { position: waitlistPosition } = useWaitlist(eventId ?? "");
  const [confirming, setConfirming] = useState(false);

  const currentUserRsvp = useMemo(() => {
    if (!rsvps || !user) return null;
    const found = rsvps.find((r) => r.user_id === user.id);
    return found?.status as RsvpStatus | undefined ?? null;
  }, [rsvps, user]);

  const countdown = useMemo(() => {
    if (!event) return null;
    const now = new Date();
    const start = new Date(event.starts_at);
    const diff = start.getTime() - now.getTime();
    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes, totalHours: diff / (1000 * 60 * 60) };
  }, [event]);

  const isOrganizer = event && user && event.organizer_id === user.id;
  const goingCount = rsvps?.filter((r) => r.status === "going").length ?? 0;
  const isFull = event?.max_players ? goingCount >= event.max_players : false;
  const isParticipant = currentUserRsvp === "going" || currentUserRsvp === "maybe";

  // Confirmation: show button when user is "going" and event is within 24 hours
  const canConfirmAttendance =
    currentUserRsvp === "going" &&
    countdown &&
    countdown.totalHours <= 24 &&
    countdown.totalHours > 0;

  const handleConfirmAttendance = async () => {
    if (!eventId || !session?.access_token) return;
    setConfirming(true);
    try {
      const res = await apiFetch("/confirm-attendance", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event_id: eventId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to confirm attendance");
      }
      toast({ title: t("events:attendance_confirmed", "Attendance confirmed!") });
    } catch (err) {
      toast({
        title: t("common:error_occurred"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  if (eventLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-3/4 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12 text-text-secondary">
        {t("common:no_results")}
      </div>
    );
  }

  const date = new Date(event.starts_at);
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const eventUrl = `${window.location.origin}${window.location.pathname}`;
  const eventTitle = event.title || t(event.type === "big" ? "events:big_event" : "events:quick_meetup");
  const spotsLeft = event.max_players ? event.max_players - goingCount : null;

  return (
    <div className="space-y-4 p-4 md:p-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <FormatBadge format={event.format} />
          {event.proxy_policy && event.proxy_policy !== "none" && (
            <ProxyPolicyBadge policy={event.proxy_policy} />
          )}
          {event.template_id && <RecurringBadge />}
          {event.status === "cancelled" && (
            <Badge variant="destructive">{t("events:event_cancelled")}</Badge>
          )}
          {event.status === "confirmed" && (
            <Badge className="bg-emerald-700 text-emerald-100 border-none">
              {t("events:event_confirmed")}
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold text-text-primary">{eventTitle}</h1>
        {/* Mood tags */}
        {event.mood_tags && event.mood_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.mood_tags.map((tag) => (
              <MoodTagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
      </div>

      {/* Countdown */}
      {countdown && (
        <Card className="bg-surface-card border-surface-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-base text-text-secondary mb-2">
              <Clock className="h-5 w-5" />
              {t("events:starts_in")}
            </div>
            <div className="flex gap-4 text-center">
              {countdown.days > 0 && (
                <div>
                  <div className="text-2xl font-bold text-accent">{countdown.days}</div>
                  <div className="text-sm text-text-secondary">{t("events:days")}</div>
                </div>
              )}
              <div>
                <div className="text-2xl font-bold text-accent">{countdown.hours}</div>
                <div className="text-sm text-text-secondary">{t("events:hours")}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">{countdown.minutes}</div>
                <div className="text-sm text-text-secondary">{t("events:minutes")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event details */}
      <Card className="bg-surface-card border-surface-hover">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3 text-text-secondary">
            <Calendar className="h-5 w-5 flex-shrink-0" />
            <span className="text-base">{dateStr} {timeStr}</span>
          </div>

          {event.venues && (
            <div className="flex items-center gap-3 text-text-secondary">
              <MapPin className="h-5 w-5 flex-shrink-0" />
              <div className="text-base">
                <div className="text-text-primary">
                  {event.venues.name}
                </div>
                <div>{event.venues.address}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-text-secondary">
            <Users className="h-5 w-5 flex-shrink-0" />
            <span className="text-base">
              {event.min_players}
              {event.max_players ? `–${event.max_players}` : "+"} {t("events:players", "players")}
              {spotsLeft !== null && spotsLeft > 0 && (
                <span className="text-accent ms-2">
                  ({t("events:spots_left", { count: spotsLeft })})
                </span>
              )}
              {spotsLeft !== null && spotsLeft <= 0 && (
                <span className="text-red-400 ms-2">({t("events:event_full")})</span>
              )}
            </span>
            {event.max_players && (
              <CircularProgress value={goingCount} max={event.max_players} size={44} />
            )}
          </div>

          {event.fee_text && (
            <div className="text-base text-text-secondary">
              <span className="font-medium text-text-primary">{t("events:fee")}:</span>{" "}
              {event.fee_text}
            </div>
          )}

          {event.description && (
            <>
              <Separator className="bg-surface-hover" />
              <div className="text-base text-text-secondary whitespace-pre-wrap">
                {event.description}
              </div>
            </>
          )}

          {event.profiles && (
            <div className="text-sm text-text-secondary">
              {t("events:organized_by", { name: event.profiles.display_name })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {event.status === "active" && (
          <RSVPButton
            eventId={event.id}
            currentStatus={currentUserRsvp}
            isFull={isFull}
            waitlistPosition={waitlistPosition}
            eventFormat={event.format}
          />
        )}
        <WhatsAppShareButton eventTitle={eventTitle} eventUrl={eventUrl} />
        <ShareButton eventId={event.id} title={eventTitle} />
        {isOrganizer && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              navigate("/events/new", {
                state: { cloneFrom: event },
              })
            }
          >
            <Copy className="h-4 w-4" />
            {t("events:clone_event")}
          </Button>
        )}
      </div>

      {/* Confirm attendance (Feature #12) */}
      {canConfirmAttendance && (
        <Card className="bg-surface-card border-emerald-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-medium text-text-primary">
                  {t("events:confirm_attendance_title", "Confirm your attendance")}
                </p>
                <p className="text-sm text-text-secondary">
                  {t("events:confirm_attendance_desc", "The event starts soon. Please confirm you are coming.")}
                </p>
              </div>
              <Button
                onClick={handleConfirmAttendance}
                disabled={confirming}
                className="gap-2 min-h-[44px] shrink-0"
              >
                <CheckCircle className="h-4 w-4" />
                {t("events:confirm", "Confirm")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendees */}
      {rsvpsLoading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : rsvps && rsvps.length > 0 ? (
        <Card className="bg-surface-card border-surface-hover">
          <CardContent className="p-4">
            <AttendeeList attendees={rsvps} />
          </CardContent>
        </Card>
      ) : null}

      {/* Organizer Messages (Feature #15) */}
      {isOrganizer && eventId && (
        <MessageComposer eventId={eventId} />
      )}

      {isParticipant && eventId && (
        <OrganizerMessagesList eventId={eventId} />
      )}

      {/* Show messages to organizer too (they should see what they sent) */}
      {isOrganizer && eventId && (
        <OrganizerMessagesList eventId={eventId} />
      )}
    </div>
  );
}
