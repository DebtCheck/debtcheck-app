import { Section as BaseSection } from "@/app/components/ui/utilities/base/section";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/app/components/ui/utilities";

export type FeatureKey = "deps" | "dead" | "secrets" | "env" | "activity" | "readonly" | "jira";


export function FeatureSection({
  id,
  title,
  children,
}: {
  id: FeatureKey;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <BaseSection
      className="mt-6"
      title={
        <a id={id} href={`#${id}`} className="no-underline">
          {title}
        </a>
      }
    >
      {children}
    </BaseSection>
  );
}

export function RulesList({
  items,
}: {
  items: ReadonlyArray<{ rule: string; status: "OK" | "Warning" | "Error" }>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {items.map((it) => (
        <Card key={`${it.rule}-${it.status}`} className="h-full">
          <CardHeader>
            <CardTitle className="text-sm">{it.status}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{it.rule}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CodeSample({ label, code }: { label: string; code: string }) {
  return (
    <div className="mt-2">
      <div className="text-xs font-semibold mb-2">{label}</div>
      <pre className="rounded-xl border border-(--line-neutral-20) bg-[rgb(var(--surface-1))] p-4 text-xs overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}
