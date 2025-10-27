import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/utilities/buttons/button";

export type RepoPaginationProps = {
  page: number; // 1-based
  hasNext: boolean;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function RepoPagination({
  page,
  hasNext,
  loading,
  onPrev,
  onNext,
}: RepoPaginationProps) {
  return (
    <div className="sticky bottom-3 mt-6 flex items-center justify-between rounded-2xl border bg-foreground/5 p-2 backdrop-blur border-border/10">
      <Button disabled={page <= 1 || Boolean(loading)} onClick={onPrev}>
        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
      </Button>
      <span className="text-sm opacity-80">Page {page}</span>
      <Button disabled={!hasNext || Boolean(loading)} onClick={onNext}>
        Next <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
