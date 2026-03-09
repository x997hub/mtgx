import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { UserRole, MtgFormat } from "@/types/database.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FormatBadge } from "@/components/shared/FormatBadge";
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

const ROLE_COLORS: Record<UserRole, string> = {
  player: "bg-surface-hover text-text-secondary",
  organizer: "bg-blue-700/30 text-blue-300",
  club_owner: "bg-purple-700/30 text-purple-300",
  admin: "bg-amber-700/30 text-amber-300",
};

export function UsersTab() {
  const { t } = useTranslation(["common", "profile"]);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  const { data: profiles, isLoading, isError } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, city, role, reliability_score, formats, created_at")
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

  const filtered = useMemo(() => {
    if (!profiles) return [];
    let result = profiles;
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.display_name?.toLowerCase().includes(q) ||
          u.city?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [profiles, roleFilter, search]);

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
    <div className="space-y-3 mt-4">
      {/* Search + filter bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder={t("common:search_users", "Search by name or city...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v as UserRole | "all")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common:all", "All")}</SelectItem>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {t(`profile:${ROLE_LABELS[role]}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Count */}
      <p className="text-sm text-text-secondary">
        {filtered.length} / {profiles?.length ?? 0}
      </p>

      {/* User list */}
      {filtered.length === 0 && (
        <p className="p-4 text-center text-text-secondary">{t("common:no_results")}</p>
      )}
      {filtered.map((user) => (
        <Card key={user.id} className="bg-surface-card border-surface-hover">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-text-primary truncate">{user.display_name}</p>
                <Badge className={`border-none text-xs shrink-0 ${ROLE_COLORS[user.role as UserRole] ?? ROLE_COLORS.player}`}>
                  {t(`profile:${ROLE_LABELS[user.role as UserRole] ?? "role_player"}`)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-text-secondary">{user.city}</span>
                {user.reliability_score != null && user.reliability_score < 1 && (
                  <Badge
                    className={`border-none text-xs ${
                      user.reliability_score < 0.5
                        ? "bg-red-700/20 text-red-400"
                        : "bg-amber-700/20 text-amber-400"
                    }`}
                  >
                    {(user.reliability_score * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
              {/* Formats */}
              {user.formats && user.formats.length > 0 && (
                <div className="flex gap-1 mt-1.5">
                  {(user.formats as MtgFormat[]).map((f) => (
                    <FormatBadge key={f} format={f} className="text-xs px-2 py-0" />
                  ))}
                </div>
              )}
            </div>
            <Select
              value={user.role}
              onValueChange={(role) =>
                updateRoleMutation.mutate({ userId: user.id, role: role as UserRole })
              }
            >
              <SelectTrigger className="w-[130px] shrink-0">
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
