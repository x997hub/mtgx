import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserRole, MtgFormat } from "@/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
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

const ROLE_VARIANT: Record<string, "neutral" | "info" | "soft" | "warning"> = {
  player: "neutral",
  organizer: "info",
  club_owner: "soft",
  admin: "warning",
};

type UserRow = {
  id: string;
  display_name: string | null;
  city: string | null;
  role: string;
  reliability_score: number | null;
  formats: string[] | null;
  created_at: string;
};

export function UsersTab() {
  const { t } = useTranslation(["common", "profile"]);
  const queryClient = useQueryClient();
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
      return data as UserRow[];
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
    if (roleFilter === "all") return profiles;
    return profiles.filter((u) => u.role === roleFilter);
  }, [profiles, roleFilter]);

  const columns = useMemo<ColumnDef<UserRow, unknown>[]>(
    () => [
      { accessorKey: "display_name", header: "Name" },
      { accessorKey: "city", header: "City" },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ getValue }) => {
          const role = getValue<string>();
          return <Badge variant={ROLE_VARIANT[role] ?? "neutral"}>{role}</Badge>;
        },
      },
      {
        accessorKey: "reliability_score",
        header: "Reliability",
        cell: ({ getValue }) => {
          const score = getValue<number | null>();
          if (score == null || score >= 1) return null;
          const pct = (score * 100).toFixed(0);
          return <Badge variant={score < 0.5 ? "danger" : "warning"}>{pct}%</Badge>;
        },
      },
      {
        accessorKey: "formats",
        header: "Formats",
        enableSorting: false,
        cell: ({ getValue }) => {
          const formats = getValue<string[] | null>();
          if (!formats || formats.length === 0) return null;
          return (
            <div className="flex gap-1">
              {formats.map((f) => (
                <FormatBadge key={f} format={f as MtgFormat} className="text-xs px-2 py-0" />
              ))}
            </div>
          );
        },
      },
      {
        id: "set_role",
        header: "Set Role",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          return (
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
          );
        },
      },
    ],
    [t, updateRoleMutation],
  );

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
    return <p className="p-4 text-danger">{t("common:error_occurred")}</p>;
  }

  return (
    <div className="space-y-3 mt-4">
      {/* Role filter */}
      <div className="flex gap-3">
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

      <DataTable data={filtered} columns={columns} />
    </div>
  );
}
