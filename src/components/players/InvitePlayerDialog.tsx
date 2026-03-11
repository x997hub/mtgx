import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInvites } from "@/hooks/useInvites";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { FORMATS } from "@/lib/constants";
import { Loader2, Send } from "lucide-react";
import type { MtgFormat } from "@/types/database.types";

interface InvitePlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetDisplayName: string;
}

export function InvitePlayerDialog({
  open,
  onOpenChange,
  targetUserId,
  targetDisplayName,
}: InvitePlayerDialogProps) {
  const { t } = useTranslation("profile");
  const { t: te } = useTranslation("events");
  const { t: tc } = useTranslation("common");
  const { sendInvite, isSending } = useInvites();
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();

  const [eventId, setEventId] = useState<string>("");
  const [format, setFormat] = useState<MtgFormat>("pauper");
  const [message, setMessage] = useState("");

  // Fetch user's upcoming events for selection
  const { data: myEvents } = useQuery({
    queryKey: ["my-upcoming-events", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("events")
        .select("id, title, format, starts_at")
        .eq("organizer_id", user.id)
        .eq("status", "active")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  async function handleSend() {
    try {
      await sendInvite({
        to_user_id: targetUserId,
        event_id: eventId || undefined,
        format: eventId ? undefined : format,
        message: message || undefined,
      });
      toast({ title: t("invite_sent") });
      onOpenChange(false);
      setEventId("");
      setMessage("");
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {t("invite_to_play")} — {targetDisplayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Event selection */}
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">{t("invite_select_event")}</p>
            <Select value={eventId || "none"} onValueChange={(v) => setEventId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("invite_select_event")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("invite_no_event")}</SelectItem>
                {myEvents?.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>
                    {ev.title || te(ev.format)} — {new Date(ev.starts_at).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Format (only if no event selected) */}
          {!eventId && (
            <div className="space-y-2">
              <p className="text-sm text-text-secondary">{te("format")}</p>
              <Select value={format} onValueChange={(v) => setFormat(v as MtgFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {te(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message */}
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("invite_message_placeholder")}
            maxLength={200}
            rows={2}
            className="resize-none"
          />
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="min-h-[44px]">
            {isSending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="me-2 h-4 w-4" />
            )}
            {t("invite_send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
