import { cn } from "@/app/lib/utils";

export type Status = "ok" | "warning" | "error" | "neutral";

export type StatusPillProps = {
  status: Status;
  compact?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export function StatusPill({
  status,
  compact,
  children,
  className,
}: StatusPillProps) {
  const style = {
    ok: "bg-[rgb(var(--color-success-bg))] text-[rgb(var(--color-success))] border-[rgb(var(--color-success))/0.25]",
    warning:
      "bg-[rgb(var(--color-warning-bg))] text-[rgb(var(--color-warning))] border-[rgb(var(--color-warning))/0.25]",
    error:
      "bg-[rgb(var(--color-danger-bg))] text-[rgb(var(--color-danger))] border-[rgb(var(--color-danger))/0.25]",
    neutral:
      "bg-[rgb(var(--color-neutral-bg))] text-[rgb(var(--color-muted))] border-[color:var(--border-12)]",
  }[status];

  const label =
    children ??
    { ok: "OK", warning: "Warning", error: "Error", neutral: "Neutral" }[
      status
    ];

  return (
    <span
      className={cn(
        // shape & layout
        "inline-flex shrink-0 items-center rounded-full border whitespace-nowrap align-middle",
        // use padding instead of fixed height + a known line-height
        compact
          ? "px-2 py-0.5 text-[11px] leading-none"
          : "px-2.5 py-1 text-xs leading-none",
        // visual style
        style,
        className
      )}
    >
      {label}
    </span>
  );
}

export function PillFromBool({
  okLabel,
  warnLabel,
  warn,
}: {
  okLabel: string;
  warnLabel: string;
  warn: boolean;
}) {
  return (
    <StatusPill status={warn ? "warning" : "ok"}>
      {warn ? warnLabel : okLabel}
    </StatusPill>
  );
}
