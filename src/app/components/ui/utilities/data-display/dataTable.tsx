"use client";

import React, { useMemo } from "react";
import { cn } from "@/app/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  width?: number | string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
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
  stickyHeader?: boolean;
  zebra?: boolean;
  density?: "comfortable" | "compact";
  className?: string;
};

function toCssWidth(w?: number | string): string | undefined {
  if (w == null) return undefined;
  return typeof w === "number" ? `${w}px` : w;
}

function ColGroup<T>({ columns }: { columns: Column<T>[] }) {
  return (
    <colgroup>
      {columns.map((c, i) => (
        <col
          key={String(c.key) || i}
          style={{
            width:
              toCssWidth(c.width) ??
              (i === 0 ? "34%" : i === 1 ? "34%" : i === 2 ? "14%" : "18%"),
          }}
        />
      ))}
    </colgroup>
  );
}

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
  const resolveKey = (row: T, i: number) =>
    rowKey ? rowKey(row, i) : String(i);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const { key, direction } = sort;
    return [...rows].sort((a: any, b: any) => {
      const av = a[key],
        bv = b[key];
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

  const cellPad = density === "compact" ? "px-3 py-1.5" : "px-3.5 sm:px-4 py-2";
  const headPad = density === "compact" ? "px-3 py-2" : "px-3.5 sm:px-4 py-2.5";

  const Thead = (
    <thead className="text-xs uppercase tracking-wide text-muted-foreground">
      <tr>
        {columns.map((c) => {
          const isSorted = sort?.key === c.key;
          const align =
            c.align === "right"
              ? "text-right"
              : c.align === "center"
              ? "text-center"
              : "text-left";
          return (
            <th
              key={String(c.key)}
              scope="col"
              aria-sort={
                isSorted
                  ? ((sort!.direction === "asc"
                      ? "ascending"
                      : "descending") as React.AriaAttributes["aria-sort"])
                  : undefined
              }
              className={cn(headPad, align, "font-medium whitespace-nowrap")}
            >
              {c.sortable && onSortChange ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:underline"
                  onClick={() =>
                    onSortChange({
                      key: String(c.key),
                      direction:
                        isSorted && sort!.direction === "asc" ? "desc" : "asc",
                    })
                  }
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
  );

  return (
    <div
      className={cn(
        // NOTE: no overflow here (keeps sticky working on desktop)
        "w-full rounded-2xl border border-(--line-06)/60 bg-[rgb(var(--surface-1))] shadow-(--shadow-1)",
        className
      )}
    >
      {/* Clip just the content to rounded corners without breaking sticky */}
      <div className="[clip-path:inset(1px_round_1rem)]">
        {/* shared horizontal scroller; vertical is page/viewport */}
        <div className="relative overflow-x-auto sm:overflow-visible">
          {/* sticky header (mobile top:0; desktop below appbar) */}
          <div
            className={cn(
              "z-30 bg-[rgb(var(--surface-1))]",
              stickyHeader
                ? "sticky top-0 sm:top-[calc(var(--appbar-h)+env(safe-area-inset-top))]"
                : "relative"
            )}
            style={{ boxShadow: "inset 0 -1px 0 var(--line-06)" }}
          >
            <table className="w-full min-w-[720px] sm:min-w-0 table-fixed border-collapse">
              <ColGroup columns={columns} />
              {Thead}
            </table>
          </div>

          {/* body */}
          <table className="w-full min-w-[720px] sm:min-w-0 table-fixed border-collapse">
            <ColGroup columns={columns} />
            {/* hidden for a11y association */}
            <thead className="sr-only">{Thead.props.children}</thead>

            <tbody
              className={cn(
                zebra &&
                  "[&>tr:nth-child(odd)]:bg-[rgb(var(--surface-1))] [&>tr:nth-child(even)]:bg-[rgb(var(--surface-2))]"
              )}
            >
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`s-${i}`}>
                    <td colSpan={columns.length} className={cellPad}>
                      <div className="h-5 w-full animate-pulse rounded bg-foreground/10" />
                    </td>
                  </tr>
                ))
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No data
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, i) => {
                  const key = resolveKey(row, i);
                  const details = rowExpansion?.(row);
                  return (
                    <React.Fragment key={key}>
                      <tr
                        className="transition-colors hover:bg-[rgb(var(--surface-2))]"
                        style={{ boxShadow: "inset 0 -1px 0 var(--line-06)" }}
                      >
                        {columns.map((c) => {
                          const align =
                            c.align === "right"
                              ? "text-right font-mono tabular-nums"
                              : c.align === "center"
                              ? "text-center"
                              : "text-left";
                          return (
                            <td
                              key={String(c.key)}
                              className={cn(cellPad, "align-top", align)}
                              title={
                                typeof (row as any)[String(c.key)] === "string"
                                  ? String((row as any)[String(c.key)])
                                  : undefined
                              }
                            >
                              {c.render
                                ? c.render(row)
                                : String((row as any)[String(c.key)] ?? "")}
                            </td>
                          );
                        })}
                      </tr>

                      {details && (
                        <tr
                          style={{ boxShadow: "inset 0 -1px 0 var(--line-06)" }}
                        >
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
    </div>
  );
}
