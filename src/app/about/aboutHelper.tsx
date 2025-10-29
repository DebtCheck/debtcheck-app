import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/utilities";

export function TechRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-semibold mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((t) => (
          <span
            key={t}
            className="rounded-lg border border-(--line-neutral-20) px-2 py-1 text-xs"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TimelineCard({
  title,
  place,
  points,
}: {
  title: string;
  place: string;
  points: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="mb-1">{title}</CardTitle>
          <p className="text-xs text-muted-foreground">{place}</p>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
