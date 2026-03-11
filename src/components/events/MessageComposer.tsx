import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";

const MAX_CHARS = 500;

interface MessageComposerProps {
  eventId: string;
}

export function MessageComposer({ eventId }: MessageComposerProps) {
  const { t } = useTranslation(["events", "common"]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const charCount = body.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSend = body.trim().length > 0 && !isOverLimit && !sending;

  const handleSend = async () => {
    if (!canSend) return;

    setSending(true);
    try {
      const res = await apiFetch("/event-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          message: body.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to send message");
      }

      setBody("");
      toast({ title: t("events:message_sent", "Message sent to participants") });
    } catch (err) {
      toast({
        title: t("common:error_occurred"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="bg-surface-card border-surface-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-text-secondary">
          {t("events:message_participants", "Message participants")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("events:message_placeholder", "Write a message to all participants...")}
          maxLength={MAX_CHARS + 50} // Allow typing slightly over to show the warning
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <span
            className={`text-sm ${
              isOverLimit ? "text-red-400" : "text-text-secondary"
            }`}
          >
            {charCount}/{MAX_CHARS}
          </span>
          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="sm"
            className="gap-2 min-h-[44px]"
          >
            <Send className="h-4 w-4" />
            {t("events:send_message", "Send")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
