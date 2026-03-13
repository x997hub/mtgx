import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type { ColumnDef };

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  pageSize?: number;
  /** CSS class for <table> element, e.g. to override min-width */
  tableClassName?: string;
}

export function DataTable<T>({
  data,
  columns,
  pageSize = 10,
  tableClassName,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Search / global filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search..."
          className={cn(
            "w-full rounded-md border border-border bg-primary pl-10 pr-4 py-2",
            "text-base text-text-primary placeholder:text-text-muted",
            "outline-none transition-colors",
            "focus:border-border-active focus:ring-1 focus:ring-accent/30",
          )}
        />
      </div>

      {/* Table wrapper — horizontal scroll on mobile */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className={cn("w-full min-w-[600px] border-collapse text-left text-base", tableClassName)}>
          {/* Header */}
          <thead className="bg-surface text-text-secondary">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-3 py-2.5 font-semibold text-sm tracking-wide whitespace-nowrap",
                        "border-b border-border",
                        canSort && "cursor-pointer select-none",
                        (header.column.columnDef.meta as Record<string, string>)?.className,
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                        {canSort && (
                          <span className="inline-flex flex-col text-text-muted">
                            {sorted === "asc" ? (
                              <ChevronUp className="size-4 text-accent" />
                            ) : sorted === "desc" ? (
                              <ChevronDown className="size-4 text-accent" />
                            ) : (
                              <ChevronsUpDown className="size-3.5 opacity-50" />
                            )}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* Body */}
          <tbody className="bg-surface-card">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-text-muted"
                >
                  No results found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "transition-colors",
                    "border-b border-border last:border-b-0",
                    "hover:bg-surface-hover",
                    "even:bg-surface-hover/50",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-3 py-2.5 text-text-primary",
                        (cell.column.columnDef.meta as Record<string, string>)?.className,
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className={cn(
              "rounded-md border border-border bg-primary px-2 py-1",
              "text-text-primary outline-none",
              "focus:border-border-active focus:ring-1 focus:ring-accent/30",
            )}
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <span className="tabular-nums">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </span>

          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className={cn(
              "rounded-md border border-border bg-surface-card px-3 py-1",
              "text-text-primary transition-colors",
              "hover:bg-surface-hover",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-card",
            )}
          >
            Prev
          </button>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className={cn(
              "rounded-md border border-border bg-surface-card px-3 py-1",
              "text-text-primary transition-colors",
              "hover:bg-surface-hover",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-card",
            )}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
