import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRDisplayProps {
  value: string;
  onClose: () => void;
}

export function QRDisplay({ value, onClose }: QRDisplayProps) {
  const { t } = useTranslation("events");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 end-4 text-white hover:bg-white/20 min-h-[44px] min-w-[44px]"
      >
        <X className="h-6 w-6" />
      </Button>
      <div className="flex flex-col items-center gap-6">
        <p className="text-xl font-bold text-white">
          {t("scan_to_checkin", "Scan to check in")}
        </p>
        <div className="rounded-2xl bg-white p-6">
          <QRCodeSVG
            value={value}
            size={280}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
      </div>
    </div>
  );
}
