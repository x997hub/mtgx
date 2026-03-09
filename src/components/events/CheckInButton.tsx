import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRScanner } from "@/components/events/QRScanner";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

export function CheckInButton() {
  const { t } = useTranslation(["events", "common"]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleScan = async (qrToken: string) => {
    setChecking(true);
    try {
      const { data, error } = await supabase.rpc(
        "checkin_by_qr" as never,
        { p_token: qrToken, p_user_id: (await supabase.auth.getUser()).data.user?.id } as never,
      );
      if (error) {
        const msg =
          error.message === "event_not_found"
            ? t("events:qr_event_not_found", "Event not found")
            : error.message === "checkin_disabled"
              ? t("events:qr_checkin_disabled", "Check-in is disabled for this event")
              : error.message === "no_rsvp"
                ? t("events:qr_no_rsvp", "You have no RSVP for this event")
                : error.message === "not_going"
                  ? t("events:qr_not_going", "You must RSVP as going first")
                  : error.message;
        throw new Error(msg);
      }
      const result = data as { already_checked_in: boolean };
      toast({
        title: result.already_checked_in
          ? t("events:already_checked_in", "Already checked in")
          : t("events:checked_in_success", "Checked in!"),
      });
    } catch (err) {
      toast({
        title: t("common:error_occurred"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setScannerOpen(true)}
        disabled={checking}
      >
        <ScanLine className="h-4 w-4" />
        {t("events:check_in", "Check in")}
      </Button>
      <QRScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
      />
    </>
  );
}
