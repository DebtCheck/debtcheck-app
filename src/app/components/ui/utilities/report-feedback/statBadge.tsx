import { cn } from "@/app/lib/utils";
import { Skeleton } from "../base/skeleton";

export type StatBadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type StatBadgeProps = {
  label: string;
  value: string | number;
  variant?: StatBadgeVariant;
  hint?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
};

export function StatBadge({
  label,
  value,
  variant = "neutral",
  hint,
  icon,
  loading,
  className,
}: StatBadgeProps) {
  const tone = {
    neutral: {
      text: "text-foreground",
      bg: "bg-card/60",
      border: "border-border/20",
    },
    success: {
      text: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    warning: {
      text: "text-yellow-700 dark:text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
    },
    danger: {
      text: "text-red-700 dark:text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
    info: {
      text: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
  }[variant];

  return (
    <div
      className={cn(
        "rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors border-(--line-neutral-15)",
        "shadow-sm hover:shadow-md",
        tone.bg,
        tone.border,
        className
      )}
    >
      <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
        {icon}
        <span>{label}</span>
      </div>

      {loading ? (
        <Skeleton variant="stat" />
      ) : (
        <div
          className={cn("text-2xl font-bold leading-tight", tone.text)}
          aria-label={`${label}: ${value}`}
        >
          {value}
        </div>
      )}

      {hint && (
        <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
      )}
    </div>
  );
}