import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { RSVPDialog } from "@/components/events/RSVPDialog";
import type { Database } from "@/types/database.types";

type RsvpStatus = Database["public"]["Enums"]["rsvp_status"];

interface RSVPButtonProps {
  eventId: string;
  currentStatus?: RsvpStatus | null;
}

export function RSVPButton({ eventId, currentStatus }: RSVPButtonProps) {
  const { t } = useTranslation("events");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant={currentStatus === "going" ? "secondary" : "default"}
        className="min-h-[44px] min-w-[44px]"
      >
        {currentStatus ? t("rsvp_change") : t("rsvp")}
      </Button>
      <RSVPDialog
        open={open}
        onOpenChange={setOpen}
        eventId={eventId}
        currentStatus={currentStatus}
      />
    </>
  );
}
