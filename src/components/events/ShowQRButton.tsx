import { useState } from "react";
import { useTranslation } from "react-i18next";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRDisplay } from "@/components/events/QRDisplay";

interface ShowQRButtonProps {
  qrToken: string;
}

export function ShowQRButton({ qrToken }: ShowQRButtonProps) {
  const { t } = useTranslation("events");
  const [showQR, setShowQR] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setShowQR(true)}
      >
        <QrCode className="h-4 w-4" />
        {t("show_qr", "Show QR")}
      </Button>
      {showQR && (
        <QRDisplay value={qrToken} onClose={() => setShowQR(false)} />
      )}
    </>
  );
}
