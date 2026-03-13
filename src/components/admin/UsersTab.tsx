import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import type { UserRole, MtgFormat, Venue } from "@/types/database.types";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { MessageCircle } from "lucide-react";

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
  email: string | null;
  city: string | null;
  role: string;
  reliability_score: number | null;
  formats: string[] | null;
  whatsapp: string | null;
  created_at: string;
};

export function UsersTab() {
  const { t } = useTranslation(["common", "profile"]);
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [pendingClubOwner, setPendingClubOwner] = useState<{ userId: string; userName: string | null } | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");

  const { data: profiles, isLoading, isError } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const res = await apiFetch("/admin/users", { method: "GET" });
      if (!res.ok) throw new Error("Failed to fetch users");
      const json = await res.json();
      return json.users as UserRow[];
    },
  });

  const { data: venues } = useQuery({
    queryKey: ["admin-venues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id, name, city")
        .order("name");
      if (error) throw error;
      return data as Pick<Venue, "id" | "name" | "city">[];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, venueId }: { userId: string; role: UserRole; venueId?: string }) => {
      if (role === "club_owner") {
        const res = await apiFetch("/admin/assign-role", {
          method: "POST",
          body: JSON.stringify({ user_id: userId, role, venue_id: venueId }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Failed to assign role");
        }
      } else {
        const { error } = await supabase
          .from("profiles")
          .update({ role })
          .eq("id", userId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onSettled: () => {
      setPendingClubOwner(null);
      setSelectedVenueId("");
    },
    onError: (err) => {
      toast({ title: err instanceof Error ? err.message : t("common:error_occurred"), variant: "destructive" });
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
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ getValue }) => {
          const email = getValue<string | null>();
          if (!email) return null;
          return <span className="text-xs text-text-secondary">{email}</span>;
        },
      },
      {
        accessorKey: "whatsapp",
        header: "WhatsApp",
        enableSorting: false,
        cell: ({ getValue }) => {
          const wa = getValue<string | null>();
          if (!wa) return null;
          const digits = wa.replace(/\D/g, "");
          return (
            <a
              href={`https://wa.me/${digits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-500"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {wa}
            </a>
          );
        },
      },
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
              onValueChange={(role) => {
                if (role === "club_owner") {
                  setPendingClubOwner({ userId: user.id, userName: user.display_name });
                } else {
                  updateRoleMutation.mutate({ userId: user.id, role: role as UserRole });
                }
              }}
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

      {/* Venue selection dialog for club_owner role */}
      <Dialog
        open={!!pendingClubOwner}
        onOpenChange={(open) => {
          if (!open) {
            setPendingClubOwner(null);
            setSelectedVenueId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common:select_venue_for_owner")}</DialogTitle>
            <DialogDescription>
              {t("common:select_venue_for_owner_desc", { name: pendingClubOwner?.userName || "" })}
            </DialogDescription>
          </DialogHeader>
          {venues && venues.length > 0 ? (
            <div className="space-y-3">
              <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common:select_venue_for_owner")} />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} — {v.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={!selectedVenueId || updateRoleMutation.isPending}
                onClick={() => {
                  if (pendingClubOwner && selectedVenueId) {
                    updateRoleMutation.mutate({
                      userId: pendingClubOwner.userId,
                      role: "club_owner",
                      venueId: selectedVenueId,
                    });
                  }
                }}
              >
                {t("common:confirm")}
              </button>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">{t("common:no_venues")}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
