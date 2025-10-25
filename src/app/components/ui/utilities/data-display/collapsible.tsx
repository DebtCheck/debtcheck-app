export function Collapsible({
  title,
  defaultOpen = true,
  right,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-2xl border bg-card/80" open={defaultOpen}>
      <summary className="list-none cursor-pointer select-none">
        <div className="px-6 py-4 flex items-center justify-between border-b border-border/10">
          <h3 className="text-base md:text-lg font-semibold">{title}</h3>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </summary>
      <div className="p-4 md:p-6">{children}</div>
    </details>
  );
}
