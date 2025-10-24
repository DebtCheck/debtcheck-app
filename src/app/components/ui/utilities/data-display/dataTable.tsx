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
  rowExpansion?: (row: T) => React.ReactNode; // if provided, rows become collapsible
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
      if (typeof av === "number" && typeof bv === "number")
        return direction === "asc" ? av - bv : bv - av;
      return direction === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [rows, sort]);

  return (
    <div className="w-full border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/60">
          <tr>
            {columns.map((c) => {
              const isSorted = sort?.key === c.key;
              const ariaSort = isSorted
                ? sort?.direction === "asc"
                  ? "ascending"
                  : "descending"
                : undefined;
              return (
                <th
                  key={String(c.key)}
                  scope="col"
                  style={{ width: c.width }}
                  className={cn(
                    "text-left font-medium px-3 py-2",
                    c.align === "right"
                      ? "text-right"
                      : c.align === "center"
                      ? "text-center"
                      : "text-left"
                  )}
                  aria-sort={ariaSort as React.AriaAttributes["aria-sort"]}
                >
                  {c.sortable && onSortChange ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:underline"
                      onClick={() => {
                        const nextDir: SortState["direction"] =
                          isSorted && sort?.direction === "asc"
                            ? "desc"
                            : "asc";
                        onSortChange({
                          key: String(c.key),
                          direction: nextDir,
                        });
                      }}
                    >
                      {c.header}
                      {isSorted ? (
                        sort?.direction === "asc" ? (
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

        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`s-${i}`} className="border-t">
                <td colSpan={columns.length} className="px-3 py-2">
                  <Skeleton variant="tableRow" />
                </td>
              </tr>
            ))
          ) : sortedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6">
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
                  <tr className="border-t">
                    {columns.map((c) => (
                      <td
                        key={String(c.key)}
                        className={cn(
                          "px-3 py-2 align-top",
                          c.align === "right"
                            ? "text-right"
                            : c.align === "center"
                            ? "text-center"
                            : "text-left"
                        )}
                      >
                        {c.render
                          ? c.render(row)
                          : String(
                              (row as Record<string, unknown>)[String(c.key)] ??
                                ""
                            )}
                      </td>
                    ))}
                  </tr>
                  {details && (
                    <tr className="border-t bg-muted/10">
                      <td colSpan={columns.length} className="px-3 py-3">
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
  );
}
