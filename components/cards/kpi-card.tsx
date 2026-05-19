import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function KpiCard({
  title,
  value,
  hint,
  tone = "neutral",
  loading,
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "risk" | "opportunity";
  loading?: boolean;
}) {
  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        tone === "risk" && "border-red-500/25",
        tone === "opportunity" && "border-emerald-500/25",
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p
            className={cn(
              "text-2xl font-semibold tracking-tight",
              tone === "risk" && "text-red-600 dark:text-red-400",
              tone === "opportunity" && "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {value}
          </p>
        )}
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
