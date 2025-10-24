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
    ok: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    warning: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
    error: "bg-red-500/15 text-red-700 border-red-500/30",
    neutral: "bg-gray-500/15 text-gray-600 border-gray-500/30",
  }[status];

  const label =
    children ??
    { ok: "OK", warning: "Warning", error: "Error", neutral: "Neutral" }[
      status
    ];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2",
        compact ? "text-[11px] h-5" : "text-xs h-6",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
