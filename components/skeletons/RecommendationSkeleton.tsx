import { Skeleton } from "@/components/ui/skeleton";

export function RecommendationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-4">
          <Skeleton className="h-5 w-56" />
          <div className="mt-3 grid grid-cols-4 gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="mt-3 h-8 w-40" />
        </div>
      ))}
    </div>
  );
}

