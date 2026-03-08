import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import type { MtgFormat, PlayerInvite } from "@/types/database.types";

export type InviteWithRelations = PlayerInvite & {
  from_profile?: { display_name: string; avatar_url: string | null } | null;
  to_profile?: { display_name: string; avatar_url: string | null } | null;
  events?: { id: string; title: string | null; format: MtgFormat; starts_at: string } | null;
};

interface SendInviteParams {
  to_user_id: string;
  event_id?: string;
  format?: string;
  message?: string;
  proposed_time?: string;
}

interface RespondInviteParams {
  invite_id: number;
  status: "accepted" | "declined";
}

export function useInvites() {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  const incomingQuery = useQuery({
    queryKey: ["invites-incoming", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("player_invites")
        .select("*, events(id, title, format, starts_at)")
        .eq("to_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Fetch sender profiles in a batch (player_invites has two profile FKs so we query separately)
      const invites = data as unknown as InviteWithRelations[];
      const senderIds = [...new Set(invites.map((i) => i.from_user_id))];
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", senderIds);
        const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
        for (const inv of invites) {
          const p = profileMap.get(inv.from_user_id);
          inv.from_profile = p ? { display_name: p.display_name, avatar_url: p.avatar_url } : null;
        }
      }
      return invites;
    },
    enabled: !!user,
  });

  const outgoingQuery = useQuery({
    queryKey: ["invites-outgoing", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("player_invites")
        .select("*, events(id, title, format, starts_at)")
        .eq("from_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const invites = data as unknown as InviteWithRelations[];
      const receiverIds = [...new Set(invites.map((i) => i.to_user_id))];
      if (receiverIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", receiverIds);
        const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
        for (const inv of invites) {
          const p = profileMap.get(inv.to_user_id);
          inv.to_profile = p ? { display_name: p.display_name, avatar_url: p.avatar_url } : null;
        }
      }
      return invites;
    },
    enabled: !!user,
  });

  // Realtime for incoming invites
  useRealtimeSubscription({
    channelName: `invites:${user?.id}`,
    table: "player_invites",
    filter: `to_user_id=eq.${user?.id}`,
    enabled: !!user,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["invites-incoming", user?.id] });
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (params: SendInviteParams) => {
      if (!user || !session) throw new Error("Not authenticated");
      const res = await apiFetch("/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send invite");
      }
      return res.json();
    },
    onError: () => {
      toast({ title: "Something went wrong", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["invites-outgoing", user?.id] });
    },
  });

  const respondInviteMutation = useMutation({
    mutationFn: async ({ invite_id, status }: RespondInviteParams) => {
      if (!session) throw new Error("Not authenticated");
      const res = await apiFetch("/invites/respond", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ invite_id, status }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to respond");
      }
      return res.json();
    },
    onError: () => {
      toast({ title: "Something went wrong", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["invites-incoming", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["invites-outgoing", user?.id] });
    },
  });

  const pendingCount = (incomingQuery.data ?? []).filter(
    (inv) => inv.status === "pending"
  ).length;

  return {
    incoming: incomingQuery.data ?? [] as InviteWithRelations[],
    outgoing: outgoingQuery.data ?? [] as InviteWithRelations[],
    isLoading: incomingQuery.isLoading || outgoingQuery.isLoading,
    pendingCount,
    sendInvite: sendInviteMutation.mutateAsync,
    respondInvite: respondInviteMutation.mutateAsync,
    isSending: sendInviteMutation.isPending,
    isResponding: respondInviteMutation.isPending,
  };
}
