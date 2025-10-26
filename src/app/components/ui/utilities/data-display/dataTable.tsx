import { cn } from "@/app/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo } from "react";
import { Skeleton } from "../base/skeleton";
import { EmptyState } from "../report-feedback/emptyState";
import React from "react";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  width?: number | string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  // optional accessibility label for th/td
  ariaLabel?: string;
};

export type SortState = { key: string; direction: "asc" | "desc" };

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  sort?: SortState;
  onSortChange?: (s: SortState) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  rowKey?: (row: T, index: number) => string;
  rowExpansion?: (row: T) => React.ReactNode;

  /** UI niceties */
  stickyHeader?: boolean;
  zebra?: boolean; // default true
  density?: "comfortable" | "compact"; // default comfortable
  className?: string; // wrapper
};

export function DataTable<T>({
  columns,
  rows,
  sort,
  onSortChange,
  loading,
  emptyState,
  rowKey,
  rowExpansion,
  stickyHeader = true,
  zebra = true,
  density = "comfortable",
  className,
}: DataTableProps<T>) {
  const resolvedKey = (row: T, i: number): string =>
    rowKey ? rowKey(row, i) : String(i);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const { key, direction } = sort;
    return [...rows].sort((a, b) => {
      const av = (a as Record<string, unknown>)[key];
      const bv = (b as Record<string, unknown>)[key];
      if (av === bv) return 0;
      if (av == null) return -1;
      if (bv == null) return 1;
      if (typeof av === "number" && typeof bv === "number") {
        return direction === "asc" ? av - bv : bv - av;
      }
      return direction === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [rows, sort]);

  const cellPad = density === "compact" ? "px-3 py-1.5" : "px-4 py-2.5";
  const headPad = density === "compact" ? "px-3 py-2" : "px-4 py-3";

  return (
    <div
      className={cn(
        "w-full rounded-xl border",
        "bg-[rgb(var(--surface-1))] border-[var(--line-08)] shadow-[var(--shadow-1)]",
        className
      )}
    >
      <div className="overflow-auto">
        <table className="min-w-full text-sm table-fixed border-separate border-spacing-0 p-1">
          <thead
            className={cn(
              stickyHeader ? "sticky" : "",
              "bg-[rgb(var(--surface-1))]/90 backdrop-blur",
              "[box-shadow:inset_0_-1px_0_var(--line-06)]",
              "text-xs uppercase tracking-wide text-muted-foreground"
            )}
          >
            <tr>
              {columns.map((c) => {
                const isSorted = sort?.key === c.key;
                const ariaSort = isSorted
                  ? sort!.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined;

                return (
                  <th
                    key={String(c.key)}
                    scope="col"
                    style={{ width: c.width }}
                    aria-sort={ariaSort as React.AriaAttributes["aria-sort"]}
                    className={cn(
                      headPad,
                      density === "compact" ? "px-3 py-2" : "px-4 py-3",
                      c.align === "right"
                        ? "text-right"
                        : c.align === "center"
                        ? "text-center"
                        : "text-left",
                      "font-medium"
                    )}
                  >
                    {c.sortable && onSortChange ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:underline"
                        onClick={() => {
                          const nextDir =
                            isSorted && sort!.direction === "asc"
                              ? "desc"
                              : "asc";
                          onSortChange!({
                            key: String(c.key),
                            direction: nextDir,
                          });
                        }}
                      >
                        {c.header}
                        {isSorted ? (
                          sort!.direction === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )
                        ) : null}
                      </button>
                    ) : (
                      <span>{c.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody
            className={cn(
              zebra &&
                "[&>tr:nth-child(odd)]:bg-[rgb(var(--surface-1))] [&>tr:nth-child(even)]:bg-[rgb(var(--surface-2))]"
            )}
          >
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`s-${i}`} className="border-t border-[var(--line-06)]">
                  <td colSpan={columns.length} className={cellPad}>
                    <Skeleton variant="tableRow" />
                  </td>
                </tr>
              ))
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8">
                  {emptyState ?? (
                    <EmptyState
                      title="No data"
                      description="Nothing to display."
                    />
                  )}
                </td>
              </tr>
            ) : (
              sortedRows.map((row, i) => {
                const key = resolvedKey(row, i);
                const details = rowExpansion?.(row);
                return (
                  <React.Fragment key={key}>
                    <tr
                      className={cn(
                        "border-t border-[var(--line-06)] transition-colors",
                        "hover:bg-[rgb(var(--surface-2))]"
                      )}
                    >
                      {columns.map((c) => (
                        <td
                          key={String(c.key)}
                          className={cn(
                            cellPad,
                            "align-top",
                            // numeric: right align + tabular figures
                            c.align === "right"
                              ? "text-right font-mono tabular-nums"
                              : c.align === "center"
                              ? "text-center"
                              : "text-left"
                          )}
                          title={
                            typeof (row as Record<string, unknown>)[
                              String(c.key)
                            ] === "string"
                              ? String(
                                  (row as Record<string, unknown>)[
                                    String(c.key)
                                  ]
                                )
                              : undefined
                          }
                        >
                          {c.render
                            ? c.render(row)
                            : String(
                                (row as Record<string, unknown>)[
                                  String(c.key)
                                ] ?? ""
                              )}
                        </td>
                      ))}
                    </tr>

                    {details && (
                      <tr className="border-t border-[var(--line-06)]">
                        <td
                          colSpan={columns.length}
                          className="px-4 py-3 bg-[rgb(var(--surface-2))]"
                        >
                          {details}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
