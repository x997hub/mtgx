import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLFG } from "@/hooks/useLFG";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/use-toast";
import { FORMATS, CITIES } from "@/lib/constants";
import type { MtgFormat } from "@/types/database.types";

export function LFGToggleButton() {
  const { t } = useTranslation("events");
  const profile = useAuthStore((s) => s.profile);
  const { mySignal, activate, deactivate, isActivating, isDeactivating } = useLFG(
    profile?.city
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<MtgFormat>(
    profile?.formats?.[0] ?? "pauper"
  );
  const [selectedCity, setSelectedCity] = useState(profile?.city ?? "");

  const handleActivate = () => {
    activate(
      { city: selectedCity, formats: [selectedFormat] },
      {
        onSuccess: () => {
          setDialogOpen(false);
          toast({ title: t("lfg_active") });
        },
        onError: () => {
          toast({ title: t("common:error"), variant: "destructive" });
        },
      }
    );
  };

  const handleDeactivate = () => {
    deactivate(undefined, {
      onSuccess: () => {
        toast({ title: t("common:success", "Signal removed") });
      },
    });
  };

  if (mySignal) {
    const expiresIn = Math.max(
      0,
      Math.round((new Date(mySignal.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))
    );

    return (
      <Button
        variant="secondary"
        className="gap-2 min-h-[44px]"
        onClick={handleDeactivate}
        disabled={isDeactivating}
      >
        <ZapOff className="h-4 w-4" />
        {t("lfg_active")} ({t("lfg_expires", { hours: expiresIn })})
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className="gap-2 min-h-[44px] border-[#e94560]/40 text-[#e94560] hover:bg-[#e94560]/10"
        onClick={() => setDialogOpen(true)}
      >
        <Zap className="h-4 w-4" />
        {t("lfg_activate")}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("lfg_activate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("format")}</Label>
              <Select
                value={selectedFormat}
                onValueChange={(v) => setSelectedFormat(v as MtgFormat)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {t(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("city")}</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder={t("city")} />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full min-h-[44px]"
              onClick={handleActivate}
              disabled={isActivating || !selectedCity}
            >
              <Zap className="h-4 w-4 mr-2" />
              {isActivating ? t("common:loading") : t("lfg_activate")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
