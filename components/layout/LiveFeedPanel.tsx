"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { SeverityBar } from "@/components/ui/severity-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { TimeAgo } from "@/components/ui/time-ago";
import { Button } from "@/components/ui/button";
import { Brain, Gauge, ArrowUpRight } from "lucide-react";
import { useLiveFeedPanelViewModel } from "./useLiveFeedPanelViewModel";

export function LiveFeedPanel() {
  const {
    selectedSignal,
    filtered,
    navigateFromSignal,
    handleSelect,
    handleAIAssessment,
    handleStressTest,
  } = useLiveFeedPanelViewModel();

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
                onClick={() => handleSelect(s)}
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
                  {selectedSignal?.id === s.id && (
                    <div className="mt-3 space-y-2 border-t border-border/60 pt-3 text-xs">
                      <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                      {s.riskFactor && (
                        <p className="font-semibold text-foreground">
                          Factor: <span className="font-normal text-muted-foreground">{s.riskFactor}</span>
                        </p>
                      )}
                      <div className="flex flex-col gap-1.5 pt-1">
                        <div className="flex gap-2">
                          <Button
                            size="xs"
                            className="flex-1 text-[11px] h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAIAssessment(s);
                            }}
                          >
                            <Brain className="mr-1 h-3.5 w-3.5" /> AI Assess
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            className="flex-1 text-[11px] h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStressTest(s);
                            }}
                          >
                            <Gauge className="mr-1 h-3.5 w-3.5" /> Stress Test
                          </Button>
                        </div>
                        <Button
                          size="xs"
                          variant="secondary"
                          className="w-full text-[11px] h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateFromSignal(s);
                          }}
                        >
                          <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> Investigate
                        </Button>
                      </div>
                    </div>
                  )}
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


