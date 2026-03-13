import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Database, EventStatus } from "@/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormatBadge } from "@/components/shared/FormatBadge";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { EVENT_STATUS_COLORS } from "@/lib/constants";

const STATUSES: EventStatus[] = ["active", "confirmed", "cancelled", "expired"];

type EventRow = Database["public"]["Tables"]["events"]["Row"] & {
  profiles?: { display_name: string } | null;
  rsvps?: { count: number }[];
};

export function EventsTab() {
  const { t } = useTranslation(["common", "events"]);
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");

  const { data: events, isLoading, isError } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, profiles!events_organizer_id_fkey(display_name), rsvps(count)" as "*")
        .order("starts_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as EventRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!events) return [];
    if (statusFilter === "all") return events;
    return events.filter((e) => e.status === statusFilter);
  }, [events, statusFilter]);

  const columns = useMemo<ColumnDef<EventRow, unknown>[]>(
    () => [
      {
        id: "format",
        header: "Format",
        accessorKey: "format",
        cell: ({ row }) => <FormatBadge format={row.original.format} />,
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => {
          const evt = row.original;
          const title = evt.title || t("events:quick_format", { format: evt.format });
          return (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-text-primary truncate">{title}</span>
              <Link
                to={`/events/${evt.id}`}
                className="text-text-secondary hover:text-accent shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          );
        },
      },
      {
        accessorKey: "starts_at",
        header: "Date",
        cell: ({ getValue }) => {
          const date = getValue<string>();
          return <span>{new Date(date).toLocaleDateString()}</span>;
        },
      },
      {
        accessorKey: "city",
        header: "City",
        meta: { className: "hidden sm:table-cell" },
      },
      {
        id: "organizer",
        header: "Organizer",
        meta: { className: "hidden lg:table-cell" },
        accessorFn: (row) => row.profiles?.display_name ?? "",
        cell: ({ getValue }) => {
          const name = getValue<string>();
          return name ? <span className="text-text-primary">{name}</span> : null;
        },
      },
      {
        id: "rsvp",
        header: "RSVP",
        enableSorting: false,
        cell: ({ row }) => {
          const evt = row.original;
          const goingCount = evt.rsvps?.[0]?.count ?? 0;
          return (
            <span className="text-text-secondary">
              {goingCount}{evt.max_players ? `/${evt.max_players}` : ""}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue<string>();
          return (
            <Badge
              className={`border-none ${EVENT_STATUS_COLORS[status as EventStatus] ?? "bg-surface-hover text-text-secondary"}`}
            >
              {status}
            </Badge>
          );
        },
      },
    ],
    [t],
  );

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="p-4 text-danger">{t("common:error_occurred")}</p>;
  }

  return (
    <div className="space-y-3 mt-2">
      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-accent text-white"
              : "bg-surface-hover text-text-secondary"
          }`}
        >
          {t("common:all", "All")} ({events?.length ?? 0})
        </button>
        {STATUSES.map((s) => {
          const count = events?.filter((e) => e.status === s).length ?? 0;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-accent text-white"
                  : "bg-surface-hover text-text-secondary"
              }`}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* Count */}
      <p className="text-sm text-text-secondary">
        {filtered.length} {t("common:events").toLowerCase()}
      </p>

      <DataTable data={filtered} columns={columns} />
    </div>
  );
}
