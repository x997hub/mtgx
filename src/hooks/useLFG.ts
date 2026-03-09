import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "@/components/ui/use-toast";
import type { MtgFormat, TimeSlot } from "@/types/database.types";

interface LFGSignal {
  id: number;
  user_id: string;
  city: string;
  formats: MtgFormat[];
  preferred_slot: TimeSlot | null;
  expires_at: string;
  created_at: string;
  profiles?: { display_name: string } | null;
}

interface ActivateLFGParams {
  city: string;
  formats: MtgFormat[];
  preferred_slot?: TimeSlot | null;
  durationHours?: number;
}

/**
 * Hook for Looking-For-Game (LFG) functionality.
 * - Query current user's active signal
 * - Query all active signals in a city
 * - Activate / deactivate signal
 * - Realtime subscription for live signal updates
 */
export function useLFG(city?: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  // Current user's active LFG signal
  const mySignalQuery = useQuery({
    queryKey: ["lfg-my", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("looking_for_game")
        .select("*")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // All active signals in the given city
  const signalsQuery = useQuery<LFGSignal[]>({
    queryKey: ["lfg-signals", city],
    queryFn: async () => {
      if (!city) return [];
      const { data, error } = await supabase
        .from("looking_for_game")
        .select("*, profiles(display_name)" as "*")
        .eq("city", city)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LFGSignal[];
    },
    enabled: !!city,
  });

  // Realtime subscription for LFG signals — scoped to city
  useRealtimeSubscription({
    channelName: `lfg:${city}`,
    table: "looking_for_game",
    filter: city ? `city=eq.${city}` : undefined,
    enabled: !!city,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["lfg-signals", city] });
      queryClient.invalidateQueries({ queryKey: ["lfg-count", city] });
    },
  });

  // Activate LFG signal (upsert — one signal per user via UNIQUE constraint)
  const activateMutation = useMutation({
    mutationFn: async ({ city: signalCity, formats, preferred_slot, durationHours = 4 }: ActivateLFGParams) => {
      if (!user) throw new Error("Not authenticated");
      const expiresAt = new Date(Date.now() + durationHours * 3600000).toISOString();
      const { data, error } = await supabase
        .from("looking_for_game")
        .upsert(
          {
            user_id: user.id,
            city: signalCity,
            formats,
            preferred_slot: preferred_slot ?? null,
            expires_at: expiresAt,
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onError: () => {
      toast({ title: "Something went wrong", variant: "destructive" });
    },
    onSuccess: () => {
      const uid = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["lfg-my", uid] });
      queryClient.invalidateQueries({ queryKey: ["lfg-signals"] });
      queryClient.invalidateQueries({ queryKey: ["lfg-count"] });
    },
  });

  // Deactivate (delete) LFG signal
  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("looking_for_game")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onError: () => {
      toast({ title: "Something went wrong", variant: "destructive" });
    },
    onSuccess: () => {
      const uid = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["lfg-my", uid] });
      queryClient.invalidateQueries({ queryKey: ["lfg-signals"] });
      queryClient.invalidateQueries({ queryKey: ["lfg-count"] });
    },
  });

  return {
    mySignal: mySignalQuery.data ?? null,
    isMySignalLoading: mySignalQuery.isLoading,
    signals: signalsQuery.data ?? [],
    isSignalsLoading: signalsQuery.isLoading,
    activate: activateMutation.mutate,
    deactivate: deactivateMutation.mutate,
    isActivating: activateMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
  };
}
