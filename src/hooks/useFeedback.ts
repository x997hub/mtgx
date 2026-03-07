import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

export type FeedbackType = "bug" | "suggestion" | "question";
export type FeedbackStatus = "new" | "in_progress" | "resolved" | "closed";

export interface FeedbackReport {
  id: number;
  user_id: string | null;
  type: FeedbackType;
  body: string;
  screenshot_url: string | null;
  page_url: string | null;
  user_agent: string | null;
  app_version: string | null;
  status: FeedbackStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SubmitFeedbackParams {
  type: FeedbackType;
  body: string;
  screenshot_url?: string | null;
}

// The feedback_reports table may not yet be in database.types.ts
// (handled by another agent), so we use explicit typing here.

export function useFeedback() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const submitMutation = useMutation({
    mutationFn: async ({ type, body, screenshot_url }: SubmitFeedbackParams) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase
        .from("feedback_reports" as "profiles") // Cast to avoid 'never' until types are updated
        .insert({
          user_id: user.id,
          type,
          body,
          screenshot_url: screenshot_url ?? null,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          app_version: null,
          status: "new",
        } as never)
        .select()
        .single() as unknown as Promise<{ data: FeedbackReport | null; error: { message: string } | null }>);

      if (error) throw error;
      return data;
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
      const { data, error } = await (supabase
        .from("feedback_reports" as "profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }) as unknown as Promise<{ data: FeedbackReport[] | null; error: { message: string } | null }>);
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
        .from("feedback_reports" as "profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.type) {
        query = query.eq("type" as "id", filters.type);
      }
      if (filters?.status) {
        query = query.eq("status" as "id", filters.status);
      }

      const { data, error } = await (query as unknown as Promise<{ data: FeedbackReport[] | null; error: { message: string } | null }>);
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
      const idColumn = "id" as string as "id";
      const { error } = await (supabase
        .from("feedback_reports" as "profiles")
        .update({ status, updated_at: new Date().toISOString() } as never)
        .eq(idColumn, id as unknown as string) as unknown as Promise<{ error: { message: string } | null }>);
      if (error) throw error;
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
      const idColumn = "id" as string as "id";
      const { error } = await (supabase
        .from("feedback_reports" as "profiles")
        .update({ admin_notes, updated_at: new Date().toISOString() } as never)
        .eq(idColumn, id as unknown as string) as unknown as Promise<{ error: { message: string } | null }>);
      if (error) throw error;
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
