import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { useRecommendedPlayers } from "@/hooks/useRecommendedPlayers";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/utils";
import { Loader2, Send, UserPlus } from "lucide-react";

interface RecommendedPlayersPanelProps {
  eventId: string;
  onDone: () => void;
}

export function RecommendedPlayersPanel({ eventId, onDone }: RecommendedPlayersPanelProps) {
  const { t } = useTranslation("profile");
  const { t: tc } = useTranslation("common");
  const { players, isLoading, sendBulkInvites, isSending } = useRecommendedPlayers(eventId);
  const { toast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  function togglePlayer(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === players.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(players.map((p) => p.user_id)));
    }
  }

  async function handleSend() {
    if (selected.size === 0) return;
    try {
      const result = await sendBulkInvites({
        eventId,
        userIds: Array.from(selected),
        message: message || undefined,
      });
      toast({ title: t("invitations_sent", { count: result.invited }) });
      onDone();
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48 rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-5 w-5 text-accent" />
          {t("recommended_players")}
        </CardTitle>
        <p className="text-sm text-gray-500">{t("recommended_players_description")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {players.length === 0 ? (
          <p className="text-base text-gray-500">{t("no_recommended_players")}</p>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={toggleAll} className="text-accent">
              {t("select_all")} ({selected.size}/{players.length})
            </Button>

            <div className="max-h-80 space-y-2 overflow-y-auto">
              {players.map((player) => {
                const initials = getInitials(player.display_name);

                return (
                  <button
                    key={player.user_id}
                    type="button"
                    onClick={() => togglePlayer(player.user_id)}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 transition-colors ${
                      selected.has(player.user_id)
                        ? "bg-accent/10 border border-accent/30"
                        : "bg-primary hover:bg-surface-hover"
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border transition-colors ${
                        selected.has(player.user_id)
                          ? "border-accent bg-accent text-white"
                          : "border-gray-600"
                      }`}
                    >
                      {selected.has(player.user_id) && (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <Avatar className="h-10 w-10">
                      {player.avatar_url ? (
                        <img src={player.avatar_url} alt={player.display_name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <AvatarFallback>{initials}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 text-start">
                      <p className="text-base font-medium text-gray-100">{player.display_name}</p>
                      <div className="flex flex-wrap gap-1">
                        {player.formats.map((f) => (
                          <FormatBadge key={f} format={f} />
                        ))}
                      </div>
                    </div>
                    {player.played_together && (
                      <span className="text-xs text-emerald-400">{t("played_together")}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("invite_message_placeholder")}
              maxLength={200}
              rows={2}
              className="resize-none"
            />

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={onDone}>
                {tc("skip")}
              </Button>
              <Button
                className="flex-1 min-h-[44px]"
                onClick={handleSend}
                disabled={selected.size === 0 || isSending}
              >
                {isSending ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="me-2 h-4 w-4" />
                )}
                {t("send_invitations")} ({selected.size})
              </Button>
            </div>
          </>
        )}

        {players.length === 0 && (
          <Button className="w-full min-h-[44px]" onClick={onDone}>
            {tc("done")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
