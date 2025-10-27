import { cn } from "@/app/lib/utils";

export type ToolbarProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode; // chips/filters
  className?: string;
};

export function Toolbar({ left, right, children, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        "w-full flex flex-wrap items-center justify-between gap-3",
        className
      )}
    >
      <div className="flex items-center gap-2">{left}</div>
      {children && <div className="flex items-center gap-2">{children}</div>}
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}
