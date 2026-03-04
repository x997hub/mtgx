import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRSVP } from "@/hooks/useRSVP";
import { toast } from "@/components/ui/use-toast";
import type { Database } from "@/types/database.types";

type RsvpStatus = Database["public"]["Enums"]["rsvp_status"];

interface RSVPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  currentStatus?: RsvpStatus | null;
}

const OPTIONS: { status: RsvpStatus; variant: "default" | "secondary" | "outline" }[] = [
  { status: "going", variant: "default" },
  { status: "maybe", variant: "secondary" },
  { status: "not_going", variant: "outline" },
];

export function RSVPDialog({ open, onOpenChange, eventId, currentStatus }: RSVPDialogProps) {
  const { t } = useTranslation("events");
  const rsvpMutation = useRSVP();

  const handleRSVP = async (status: RsvpStatus) => {
    try {
      await rsvpMutation.mutateAsync({ eventId, status });
      onOpenChange(false);
    } catch {
      toast({ title: t("common:error"), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("rsvp")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {OPTIONS.map(({ status, variant }) => (
            <Button
              key={status}
              variant={currentStatus === status ? "default" : variant}
              className="min-h-[44px] w-full"
              onClick={() => handleRSVP(status)}
              disabled={rsvpMutation.isPending}
            >
              {t(status)}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
