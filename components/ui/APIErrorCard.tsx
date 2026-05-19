"use client";

import { Button } from "@/components/ui/button";

export function APIErrorCard({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
      <span>Failed to load: {error}</span>
      <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
