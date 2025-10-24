import { cn } from "@/app/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

export function Section({ title, subtitle, actions, children, padded = true, className }: {
  title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; padded?: boolean; className?: string;
}) {
  return (
    <Card className={cn("bg-card/80 border-border/10 text-foreground", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base md:text-lg">{title}</CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </CardHeader>
      <CardContent className={padded ? "p-6" : "p-0"}>{children}</CardContent>
    </Card>
  );
}