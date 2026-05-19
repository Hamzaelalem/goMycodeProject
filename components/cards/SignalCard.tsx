"use client";

import { SeverityBar } from "@/components/ui/severity-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useNavigateFromSignal } from "@/lib/hooks/useSignalNavigation";
import { TimeAgo } from "@/components/ui/time-ago";
import type { Signal } from "@/types";

export function SignalCard({ signal, navigable = false }: { signal: Signal; navigable?: boolean }) {
  const navigateFromSignal = useNavigateFromSignal();
  const inner = (
    <SeverityBar severity={signal.severity}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{signal.title}</p>
        <TimeAgo iso={signal.timestamp} className="text-[11px] text-muted-foreground" />
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{signal.body}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <StatusBadge kind="signalType" value={signal.type} />
        <StatusBadge kind="severity" value={signal.severity} />
        <span className="text-xs text-muted-foreground">{signal.country} · {signal.sector}</span>
      </div>
    </SeverityBar>
  );

  if (navigable) {
    return (
      <button
        type="button"
        className="w-full rounded-xl border border-border p-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => navigateFromSignal(signal)}
      >
        {inner}
      </button>
    );
  }

  return <div className="rounded-xl border border-border p-3">{inner}</div>;
}

