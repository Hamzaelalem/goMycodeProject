"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { SeverityBar } from "@/components/ui/severity-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFilteredSignals } from "@/lib/hooks/useCrossModuleFilter";
import { useNavigateFromSignal } from "@/lib/hooks/useSignalNavigation";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import { TimeAgo } from "@/components/ui/time-ago";

export function LiveFeedPanel() {
  const navigateFromSignal = useNavigateFromSignal();
  const signals = useGlobalStore((s) => s.signals);
  const selectedSignal = useGlobalStore((s) => s.selectedSignal);
  const filtered = useFilteredSignals(signals).slice(0, 10);

  return (
    <aside className="hidden h-full w-[300px] shrink-0 border-l border-border bg-background lg:block">
      <div className="h-14 border-b border-border px-4 py-3">
        <p className="text-sm font-medium">Live Feed</p>
        <p className="text-xs text-muted-foreground">Last 10 signals</p>
      </div>
      <ScrollArea className="h-[calc(100dvh-56px)]">
        <ul className="space-y-2 p-3">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={
                  selectedSignal?.id === s.id
                    ? "w-full rounded-xl border-2 border-ring bg-card p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    : "w-full rounded-xl border border-border bg-card p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                }
                onClick={() => navigateFromSignal(s)}
              >
                <SeverityBar severity={s.severity}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-medium">{s.title}</p>
                    <TimeAgo iso={s.timestamp} className="shrink-0 text-[10px] text-muted-foreground" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge kind="signalType" value={s.type} />
                    <StatusBadge kind="severity" value={s.severity} />
                    <span className="text-xs text-muted-foreground">
                      {s.region} · {s.sector}
                    </span>
                  </div>
                </SeverityBar>
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
              No signals in the last 24 hours.
            </li>
          ) : null}
        </ul>
      </ScrollArea>
    </aside>
  );
}

