import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-44" />
      <Skeleton className="h-[70dvh] w-full" />
    </div>
  );
}

