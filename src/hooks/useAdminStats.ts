import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface AdminStats {
  computed_at: string;
  today: {
    inactive_organizers: { id: string; display_name: string }[];
    stale_lfg_count: number;
    active_lfg: number;
  };
  this_week: {
    total_users: number;
    new_users: number;
    new_users_prev_week: number;
    activation_rate: number;
    events_created: number;
    rsvps: number;
    lfg_conversion_rate: number;
    silent_exit_count: number;
  };
  trends: {
    stat_date: string;
    metric_key: string;
    value: number;
  }[];
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await apiFetch("/admin/stats", {
        method: "GET",
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to fetch stats" }));
        throw new Error(err.error || "Failed to fetch stats");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 min
  });
}
