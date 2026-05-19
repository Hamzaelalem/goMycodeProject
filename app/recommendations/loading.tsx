import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-56" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-[110px] w-full" />
      ))}
    </div>
  );
}

