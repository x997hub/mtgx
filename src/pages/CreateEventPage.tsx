import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FormLayout } from "@/components/layout/FormLayout";
import { EventTypeToggle } from "@/components/events/EventTypeToggle";
import { BigEventForm } from "@/components/events/BigEventForm";
import { QuickMeetupForm } from "@/components/events/QuickMeetupForm";
import type { EventType, MtgFormat } from "@/types/database.types";

export default function CreateEventPage() {
  const { t } = useTranslation("events");
  const location = useLocation();
  const cloneFrom = (location.state as { cloneFrom?: Record<string, unknown> } | null)
    ?.cloneFrom;

  const [eventType, setEventType] = useState<EventType>(
    (cloneFrom?.type as EventType) ?? "quick"
  );

  return (
    <FormLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-text-primary">
          {t("create_event")}
        </h1>

        <EventTypeToggle value={eventType} onChange={setEventType} />

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
          />
        )}
      </div>
    </FormLayout>
  );
}
