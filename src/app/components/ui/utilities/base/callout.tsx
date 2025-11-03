"use client";

import { cn } from "@/app/lib/utils";

export function Callout({
  children,
  className,
  variant = "warning",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "warning" | "info" | "danger";
}) {
  const theme =
    variant === "warning"
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-900 dark:text-yellow-200"
      : variant === "danger"
      ? "border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-200"
      : "border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200";

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-xs sm:text-sm",
        theme,
        className
      )}
      role="note"
    >
      {children}
    </div>
  );
}