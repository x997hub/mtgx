import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RecommendedPlayersPanel } from "@/components/events/RecommendedPlayersPanel";
import { FormLayout } from "@/components/layout/FormLayout";
import { EventTypeToggle } from "@/components/events/EventTypeToggle";
import { BigEventForm } from "@/components/events/BigEventForm";
import { QuickMeetupForm } from "@/components/events/QuickMeetupForm";
import { useAuth } from "@/hooks/useAuth";
import type { EventType, MtgFormat, UserRole } from "@/types/database.types";

const CAN_CREATE_BIG: UserRole[] = ["organizer", "club_owner", "admin"];

export default function CreateEventPage() {
  const { t } = useTranslation("events");
  const { profile } = useAuth();
  const location = useLocation();
  const cloneFrom = (location.state as { cloneFrom?: Record<string, unknown> } | null)
    ?.cloneFrom;

  const canCreateBig = profile != null && CAN_CREATE_BIG.includes(profile.role);

  const navigate = useNavigate();
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<EventType>(() => {
    const cloneType = cloneFrom?.type as EventType | undefined;
    if (cloneType === "big" && !canCreateBig) return "quick";
    return cloneType ?? "quick";
  });

  if (createdEventId) {
    return (
      <FormLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-text-primary">
            {t("create_event")}
          </h1>
          <RecommendedPlayersPanel
            eventId={createdEventId}
            onDone={() => navigate("/")}
          />
        </div>
      </FormLayout>
    );
  }

  return (
    <FormLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          {t("create_event")}
        </h1>

        {canCreateBig && (
          <EventTypeToggle value={eventType} onChange={setEventType} />
        )}

        {/* When cloning, starts_at is intentionally omitted from defaultValues
            to prevent creating duplicate events at the same date/time.
            The organizer must pick a new date for the cloned event. */}
        {eventType === "big" ? (
          <BigEventForm
            defaultValues={
              cloneFrom
                ? {
                    title: cloneFrom.title as string,
                    format: cloneFrom.format as MtgFormat,
                    city: cloneFrom.city as string,
                    venue_id: cloneFrom.venue_id as string,
                    min_players: cloneFrom.min_players as number,
                    max_players: cloneFrom.max_players as number,
                    fee_text: cloneFrom.fee_text as string,
                    description: cloneFrom.description as string,
                  }
                : undefined
            }
            clonedFrom={cloneFrom?.id as string | undefined}
            onCreated={setCreatedEventId}
          />
        ) : (
          <QuickMeetupForm
            defaultValues={
              cloneFrom
                ? {
                    format: cloneFrom.format as MtgFormat,
                    city: cloneFrom.city as string,
                    min_players: cloneFrom.min_players as number,
                  }
                : undefined
            }
            onCreated={setCreatedEventId}
          />
        )}
      </div>
    </FormLayout>
  );
}
