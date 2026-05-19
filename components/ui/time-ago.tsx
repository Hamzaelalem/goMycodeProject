"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/utils/formatters";

type TimeAgoProps = {
  iso: string;
  className?: string;
};

/** Relative time label; renders only on the client to avoid SSR hydration mismatches. */
export function TimeAgo({ iso, className }: TimeAgoProps) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setLabel(formatTimeAgo(iso));
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, [iso]);

  return (
    <span className={cn("tabular-nums", className)} suppressHydrationWarning>
      {label ?? "\u00a0"}
    </span>
  );
}
