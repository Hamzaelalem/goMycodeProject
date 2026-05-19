import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      {Array.from({ length: 5 }).map((_, r) => (
        <div key={r} className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((__, c) => (
            <Skeleton key={c} className="h-7 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

