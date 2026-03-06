import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { RSVPDialog } from "@/components/events/RSVPDialog";
import { WaitlistBadge } from "@/components/events/WaitlistBadge";
import type { Database } from "@/types/database.types";

type RsvpStatus = Database["public"]["Enums"]["rsvp_status"];

interface RSVPButtonProps {
  eventId: string;
  currentStatus?: RsvpStatus | null;
  isFull?: boolean;
  waitlistPosition?: number | null;
  /** Pass event format to enable power level picker for commander */
  eventFormat?: string;
}

export function RSVPButton({ eventId, currentStatus, isFull, waitlistPosition, eventFormat }: RSVPButtonProps) {
  const { t } = useTranslation("events");
  const [open, setOpen] = useState(false);

  // If user is waitlisted, show the waitlist badge
  if (currentStatus === "waitlisted" && waitlistPosition) {
    return (
      <div className="flex items-center gap-2">
        <WaitlistBadge position={waitlistPosition} />
        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          size="sm"
          className="min-h-[44px]"
        >
          {t("rsvp_change")}
        </Button>
        <RSVPDialog
          open={open}
          onOpenChange={setOpen}
          eventId={eventId}
          currentStatus={currentStatus}
          eventFormat={eventFormat}
        />
      </div>
    );
  }

  // Determine button label
  let label: string;
  if (currentStatus) {
    label = t("rsvp_change");
  } else if (isFull) {
    label = t("join_waitlist", "Join Waitlist");
  } else {
    label = t("rsvp");
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant={currentStatus === "going" ? "secondary" : "default"}
        className="min-h-[44px] min-w-[44px]"
      >
        {label}
      </Button>
      <RSVPDialog
        open={open}
        onOpenChange={setOpen}
        eventId={eventId}
        currentStatus={currentStatus}
        eventFormat={eventFormat}
      />
    </>
  );
}
