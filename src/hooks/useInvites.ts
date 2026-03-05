import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { InviteStatus, MtgFormat, PlayerInvite } from "@/types/database.types";

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
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

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
      // Fetch sender profiles separately since hand-written types lack Relationships
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
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("invites:" + user.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_invites",
          filter: `to_user_id=eq.${user.id}`,
        },
        () => {
          queryClientRef.current.invalidateQueries({ queryKey: ["invites-incoming", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const sendInviteMutation = useMutation({
    mutationFn: async (params: SendInviteParams) => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) throw new Error("Not authenticated");
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mtgx-api/invites`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send invite");
      }
      return res.json();
    },
    onSettled: () => {
      const uid = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["invites-outgoing", uid] });
    },
  });

  const respondInviteMutation = useMutation({
    mutationFn: async ({ invite_id, status }: RespondInviteParams) => {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mtgx-api/invites/respond`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ invite_id, status }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to respond");
      }
      return res.json();
    },
    onSettled: () => {
      const uid = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["invites-incoming", uid] });
      queryClient.invalidateQueries({ queryKey: ["invites-outgoing", uid] });
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
