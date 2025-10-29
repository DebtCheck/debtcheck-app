import { cn } from "@/app/lib/utils";

export function ProgressBar({
  value = 0,
  indeterminate,
  size = "md",
  label,
}: {
  value?: number;
  indeterminate?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const height = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" }[size];
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      {label && (
        <div className="sr-only" role="status">
          {label}
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full overflow-hidden",
          "bg-[rgb(var(--surface-3))] border border-(--line-neutral-15)",
          height
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clamped}
      >
        <div
          className={cn(
            "h-full transition-all",
            indeterminate
              ? "animate-pulse w-1/3 bg-[rgb(var(--accent-6))]"
              : "bg-[rgb(var(--accent-10))]"
          )}
          style={indeterminate ? undefined : { width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
