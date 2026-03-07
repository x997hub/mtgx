import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/database.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const ROLES: UserRole[] = ["player", "organizer", "club_owner", "admin"];

const ROLE_LABELS: Record<UserRole, string> = {
  player: "role_player",
  organizer: "role_organizer",
  club_owner: "role_club_owner",
  admin: "role_admin",
};

export function UsersTab() {
  const { t } = useTranslation(["common", "profile"]);
  const queryClient = useQueryClient();

  const { data: profiles, isLoading, isError } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: () => {
      toast({ title: t("common:error_occurred"), variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="p-4 text-red-400">{t("common:error_occurred")}</p>;
  }

  return (
    <div className="space-y-2 mt-4">
      {profiles && profiles.length === 0 && (
        <p className="p-4 text-center text-text-secondary">{t("common:no_results")}</p>
      )}
      {profiles?.map((user) => (
        <Card key={user.id} className="bg-surface-card border-surface-hover">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-text-primary">{user.display_name}</p>
              <div className="flex items-center gap-2 text-base text-text-secondary">
                <span>{user.city}</span>
                {user.reliability_score != null && user.reliability_score < 1 && (
                  <Badge
                    className={`border-none text-xs ${
                      user.reliability_score < 0.5
                        ? "bg-red-700/20 text-red-400"
                        : "bg-amber-700/20 text-amber-400"
                    }`}
                  >
                    {t("profile:reliability_score", "Reliability")}: {(user.reliability_score * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
            </div>
            <Select
              value={user.role}
              onValueChange={(role) =>
                updateRoleMutation.mutate({ userId: user.id, role: role as UserRole })
              }
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {t(`profile:${ROLE_LABELS[role]}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
