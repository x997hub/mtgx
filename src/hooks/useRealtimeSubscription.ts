import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type PgEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeSubscriptionOptions {
  channelName: string;
  table: string;
  filter?: string;
  event?: PgEvent;
  enabled?: boolean;
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

/**
 * Subscribe to Supabase Realtime postgres_changes on a table.
 * Automatically manages channel lifecycle.
 */
export function useRealtimeSubscription({
  channelName,
  table,
  filter,
  event = "*",
  enabled = true,
  onChange,
}: UseRealtimeSubscriptionOptions) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          ...(filter && { filter }),
        },
        (payload) => onChangeRef.current(payload),
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [channelName, table, filter, event, enabled]);
}
