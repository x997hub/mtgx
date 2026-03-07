import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import type { MtgFormat } from "@/types/database.types";

interface InstantLFGSignal {
  id: number;
  user_id: string;
  city: string;
  formats: MtgFormat[];
  duration_hours: number;
  is_instant: boolean;
  expires_at: string;
  created_at: string;
  profiles?: { display_name: string } | null;
}

interface ActivateInstantParams {
  city: string;
  formats: MtgFormat[];
  duration_hours: number;
}

/**
 * Hook for "Going Today" (instant LFG) functionality.
 * - Activate an instant LFG signal with duration
 * - Query all instant signals in the same city
 * - Live counter for real-time updates
 */
export function useGoingToday(city?: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  // Count of instant LFG signals in the city
  const instantCountQuery = useQuery({
    queryKey: ["lfg-instant-count", city],
    queryFn: async () => {
      if (!city) return 0;
      const { count, error } = await supabase
        .from("looking_for_game")
        .select("*", { count: "exact", head: true })
        .eq("city", city)
        .eq("is_instant", true)
        .gt("expires_at", new Date().toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!city,
    refetchInterval: 30000,
  });

  // All instant signals in the city (for details display)
  const instantSignalsQuery = useQuery<InstantLFGSignal[]>({
    queryKey: ["lfg-instant-signals", city],
    queryFn: async () => {
      if (!city) return [];
      const { data, error } = await supabase
        .from("looking_for_game")
        .select("*, profiles(display_name)" as "*")
        .eq("city", city)
        .eq("is_instant", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InstantLFGSignal[];
    },
    enabled: !!city,
    refetchInterval: 30000,
  });

  // Current user's instant signal
  const myInstantQuery = useQuery({
    queryKey: ["lfg-my-instant", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("looking_for_game")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_instant", true)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Realtime subscription
  useRealtimeSubscription({
    channelName: `lfg-instant:${city}`,
    table: "looking_for_game",
    enabled: !!city,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["lfg-instant-count", city] });
      queryClient.invalidateQueries({ queryKey: ["lfg-instant-signals", city] });
      queryClient.invalidateQueries({ queryKey: ["lfg-count", city] });
    },
  });

  // Activate instant LFG
  const activateMutation = useMutation({
    mutationFn: async ({ city: signalCity, formats, duration_hours }: ActivateInstantParams) => {
      if (!user) throw new Error("Not authenticated");
      const expiresAt = new Date(Date.now() + duration_hours * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("looking_for_game")
        .upsert(
          {
            user_id: user.id,
            city: signalCity,
            formats,
            is_instant: true,
            duration_hours,
            expires_at: expiresAt,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          { onConflict: "user_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      const uid = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["lfg-my-instant", uid] });
      queryClient.invalidateQueries({ queryKey: ["lfg-my", uid] });
      queryClient.invalidateQueries({ queryKey: ["lfg-instant-count"] });
      queryClient.invalidateQueries({ queryKey: ["lfg-instant-signals"] });
      queryClient.invalidateQueries({ queryKey: ["lfg-signals"] });
      queryClient.invalidateQueries({ queryKey: ["lfg-count"] });
    },
  });

  // Deactivate instant LFG
  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("looking_for_game")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSettled: () => {
      const uid = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["lfg-my-instant", uid] });
      queryClient.invalidateQueries({ queryKey: ["lfg-my", uid] });
      queryClient.invalidateQueries({ queryKey: ["lfg-instant-count"] });
      queryClient.invalidateQueries({ queryKey: ["lfg-instant-signals"] });
      queryClient.invalidateQueries({ queryKey: ["lfg-signals"] });
      queryClient.invalidateQueries({ queryKey: ["lfg-count"] });
    },
  });

  return {
    instantCount: instantCountQuery.data ?? 0,
    instantSignals: instantSignalsQuery.data ?? [],
    myInstant: myInstantQuery.data ?? null,
    isMyInstantLoading: myInstantQuery.isLoading,
    activate: activateMutation.mutate,
    deactivate: deactivateMutation.mutate,
    isActivating: activateMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
  };
}
