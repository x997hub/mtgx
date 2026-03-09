import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (result: string) => void;
}

export function QRScanner({ open, onOpenChange, onScan }: QRScannerProps) {
  const { t } = useTranslation("events");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!open) return;

    // Small delay to ensure dialog is rendered
    const timeout = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false,
      );

      scanner.render(
        (decodedText) => {
          onScan(decodedText);
          scanner.clear().catch(() => {});
          onOpenChange(false);
        },
        () => {
          // Scan error — ignore, keep scanning
        },
      );

      scannerRef.current = scanner;
    }, 100);

    return () => {
      clearTimeout(timeout);
      scannerRef.current?.clear().catch(() => {});
      scannerRef.current = null;
    };
  }, [open, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("scan_qr", "Scan QR code")}</DialogTitle>
        </DialogHeader>
        <div id="qr-reader" className="w-full" />
      </DialogContent>
    </Dialog>
  );
}
