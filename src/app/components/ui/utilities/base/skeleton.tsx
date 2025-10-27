import { cn } from "@/app/lib/utils";

export type SkeletonProps = {
  variant: "card" | "tableRow" | "stat" | "text" | "avatar";
  lines?: number;
  className?: string;
};

export function Skeleton({ variant, lines = 3, className }: SkeletonProps) {
  if (variant === "card")
    return (
      <div
        className={cn(
          "rounded-xl border bg-muted/40 animate-pulse h-32",
          className
        )}
      />
    );
  if (variant === "stat")
    return (
      <div
        className={cn(
          "mt-2 h-7 w-16 rounded bg-muted animate-pulse",
          className
        )}
      />
    );
  if (variant === "avatar")
    return (
      <div
        className={cn(
          "rounded-full bg-muted animate-pulse",
          className ?? "h-10 w-10"
        )}
      />
    );
  if (variant === "tableRow")
    return (
      <div
        className={cn("h-10 bg-muted/40 animate-pulse rounded", className)}
      />
    );
  // text
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-muted/60 rounded animate-pulse" />
      ))}
    </div>
  );
}
