"use client";

import { AlertTriangle } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ScoreBreakdownChart } from "@/components/ui/ScoreBreakdownChart";
import { StatusTimeline } from "@/components/ui/StatusTimeline";
import { TimeAgo } from "@/components/ui/time-ago";
import { SignalCard } from "@/components/cards/SignalCard";
import { useRecommendationDrawerViewModel } from "./useRecommendationDrawerViewModel";

function formatAuditAction(action: string): string {
  if (action === "generated") return "Generated";
  if (action === "generated_flagged") return "Generated · flagged for review";
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RecommendationDrawer() {
  const {
    open,
    close,
    selected,
    flagged,
    auditLogs,
    linkedSignals,
    entries,
    handleApprove,
    handleReject,
    handleSendToBoard,
    handleAskAI,
  } = useRecommendationDrawerViewModel();

  if (!selected) return null;

  const provenanceLabel = selected.dataSource === "live" ? "AI-generated" : "Seed data";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && close()}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>{selected.title}</SheetTitle>
          <SheetDescription>
            {selected.region} · {selected.sector}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100dvh-180px)] px-4">
          <div className="space-y-6 pb-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{provenanceLabel}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{selected.modelVersion}</span>
            </div>

            {flagged ? (
              <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="text-xs">
                  <p className="font-medium">Flagged for human review</p>
                  <p className="mt-0.5 text-amber-700/80 dark:text-amber-400/80">
                    The model&apos;s confidence diverged from the risk-adjusted estimate by more than 15 points.
                    See the audit trail below before approving.
                  </p>
                </div>
              </div>
            ) : null}

            <div>
              <p className="text-sm text-muted-foreground">{selected.rationale}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Score breakdown</p>
              <ScoreBreakdownChart recommendation={selected} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Linked signals</p>
              <div className="space-y-2">
                {linkedSignals.map((s) => (
                  <SignalCard key={s.id} signal={s} navigable />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Workflow history</p>
              <StatusTimeline
                currentStatus={
                  selected.status === "pending_review"
                    ? "PENDING_REVIEW"
                    : selected.status === "under_review"
                      ? "UNDER_REVIEW"
                      : selected.status === "approved"
                        ? "APPROVED"
                        : "REJECTED"
                }
                entries={entries}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Audit trail</p>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No audit entries.</p>
              ) : (
                <ul className="space-y-2">
                  {auditLogs.map((log) => (
                    <li key={log.id} className="rounded-lg border border-border p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{formatAuditAction(log.action)}</span>
                        <TimeAgo iso={log.at} />
                      </div>
                      {log.comment ? (
                        <p className="mt-1 text-muted-foreground">{log.comment}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ScrollArea>
        <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
          <Button onClick={handleApprove}>Approve</Button>
          <Button variant="destructive" onClick={handleReject}>
            Reject
          </Button>
          <Button variant="secondary" onClick={handleSendToBoard}>
            Send to board
          </Button>
          <Button variant="outline" onClick={handleAskAI}>
            Ask AI
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}


