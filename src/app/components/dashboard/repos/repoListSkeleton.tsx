import { Skeleton } from "@/app/components/ui/utilities/base/skeleton";
export function RepoListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="card" className="h-24" />
      ))}
    </div>
  );
}
