import { cn } from "@/app/lib/utils";

export function Collapsible({
  title,
  defaultOpen = true,
  right,
  children,
  className,
  headerClassName,
  contentClassName,
}: {
  title: string;
  defaultOpen?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "rounded-2xl border overflow-hidden transition-all",
        "bg-[rgb(var(--surface-1))] border-[color:var(--line-neutral-20)] shadow-[var(--shadow-1)] dark:shadow-[var(--shadow-1)]",
        className
      )}
    >
      <summary className="list-none cursor-pointer select-none">
        <div
          className={cn(
            "px-6 py-4 flex items-center justify-between border-b border-[color:var(--line-neutral-20)]",
            headerClassName
          )}
        >
          <h3 className="text-base md:text-lg font-semibold">{title}</h3>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </summary>
      <div className={cn("p-4 md:p-6", contentClassName)}>{children}</div>
    </details>
  );
}
