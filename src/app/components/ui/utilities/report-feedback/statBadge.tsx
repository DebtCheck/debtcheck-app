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
};

export function StatBadge({
  label,
  value,
  variant = "neutral",
  hint,
  icon,
  loading,
}: StatBadgeProps) {
  const tone = {
    neutral: "",
    success: "text-emerald-700",
    warning: "text-yellow-700",
    danger: "text-red-700",
    info: "text-blue-700",
  }[variant];

  return (
    <div className="rounded-xl border p-4 bg-background">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </div>
      {loading ? (
        <Skeleton variant="stat" />
      ) : (
        <div
          className={cn("text-2xl font-bold mt-1", tone)}
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
