import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/use-toast";
import type {
  FeedbackType,
  FeedbackStatus,
  FeedbackReport,
  FeedbackReportInsert,
  FeedbackReportUpdate,
} from "@/types/database.types";

export type { FeedbackType, FeedbackStatus, FeedbackReport };

interface SubmitFeedbackParams {
  type: FeedbackType;
  body: string;
  screenshot_url?: string | null;
}

export function useFeedback() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const submitMutation = useMutation({
    mutationFn: async ({ type, body, screenshot_url }: SubmitFeedbackParams) => {
      if (!user) throw new Error("Not authenticated");

      const row: FeedbackReportInsert = {
        user_id: user.id,
        type,
        body,
        screenshot_url: screenshot_url ?? null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        app_version: null,
        status: "new",
      };

      const { data, error } = await supabase
        .from("feedback_reports")
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return data as FeedbackReport;
    },
    onError: () => {
      toast({ title: "Something went wrong", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
  });

  // User's own feedback
  const ownFeedbackQuery = useQuery({
    queryKey: ["feedback", "own", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("feedback_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeedbackReport[];
    },
    enabled: !!user,
  });

  return {
    submitFeedback: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    ownFeedback: ownFeedbackQuery.data ?? [],
    isLoadingOwn: ownFeedbackQuery.isLoading,
  };
}

/**
 * Admin hook for managing all feedback reports.
 */
export function useAdminFeedback(filters?: {
  type?: FeedbackType;
  status?: FeedbackStatus;
}) {
  const queryClient = useQueryClient();

  const feedbackQuery = useQuery({
    queryKey: ["feedback", "admin", filters?.type, filters?.status],
    queryFn: async () => {
      let query = supabase
        .from("feedback_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.type) {
        query = query.eq("type", filters.type);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as FeedbackReport[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: FeedbackStatus;
    }) => {
      const updates: FeedbackReportUpdate = {
        status,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("feedback_reports")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onError: () => {
      toast({ title: "Something went wrong", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback", "admin"] });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({
      id,
      admin_notes,
    }: {
      id: number;
      admin_notes: string;
    }) => {
      const updates: FeedbackReportUpdate = {
        admin_notes,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("feedback_reports")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onError: () => {
      toast({ title: "Something went wrong", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback", "admin"] });
    },
  });

  return {
    feedback: feedbackQuery.data ?? [],
    isLoading: feedbackQuery.isLoading,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
    updateNotes: updateNotesMutation.mutateAsync,
    isUpdatingNotes: updateNotesMutation.isPending,
  };
}
