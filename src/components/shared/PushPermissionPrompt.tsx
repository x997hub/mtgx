import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { usePush } from "@/hooks/usePush";

interface PushPermissionPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PushPermissionPrompt({ open, onOpenChange }: PushPermissionPromptProps) {
  const { t } = useTranslation();
  const { requestPermission } = usePush();

  const handleAllow = async () => {
    await requestPermission();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e94560]/20">
            <Bell className="h-6 w-6 text-[#e94560]" />
          </div>
          <DialogTitle className="text-center">{t("push_notifications")}</DialogTitle>
          <DialogDescription className="text-center">
            Get notified when new events match your availability, when events fill up, and 24h reminders.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleAllow} className="w-full">
            {t("confirm")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            {t("skip")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
