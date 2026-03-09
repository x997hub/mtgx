import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";

interface OrganizerMessage {
  id: number;
  event_id: string;
  organizer_id: string;
  body: string;
  created_at: string;
}

interface OrganizerMessagesListProps {
  eventId: string;
}

export function OrganizerMessagesList({ eventId }: OrganizerMessagesListProps) {
  const { t } = useTranslation("events");

  const { data: messages, isLoading } = useQuery({
    queryKey: ["organizer-messages", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizer_messages")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!eventId,
  });

  if (isLoading) {
    return <Skeleton className="h-20 rounded-lg" />;
  }

  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <Card className="bg-surface-card border-surface-hover">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-text-secondary">
          <MessageSquare className="h-4 w-4" />
          {t("organizer_messages", "Messages from organizer")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="rounded-lg bg-primary p-3 space-y-1"
          >
            <p className="text-base text-text-primary whitespace-pre-wrap">
              {msg.body}
            </p>
            <p className="text-xs text-text-secondary">
              {timeAgo(msg.created_at)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
