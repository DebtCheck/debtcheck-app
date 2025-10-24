import { cn } from "@/app/lib/utils";

export type Severity = "low" | "medium" | "high" | "critical";

export type SeverityPillProps = {
  level: Severity;
  compact?: boolean;
  className?: string;
};

export function SeverityPill({ level, compact, className }: SeverityPillProps) {
  const style = {
    low: "bg-emerald-600 text-white",
    medium: "bg-yellow-600 text-white",
    high: "bg-orange-600 text-white",
    critical: "bg-red-600 text-white",
  }[level];
  return (
    <span
      aria-label={`Severity: ${level}`}
      className={cn(
        "inline-flex items-center rounded-full px-2",
        compact ? "text-[11px] h-5" : "text-xs h-6",
        style,
        className
      )}
    >
      {level}
    </span>
  );
}
