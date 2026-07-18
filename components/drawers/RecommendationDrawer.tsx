"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ScoreBreakdownChart } from "@/components/ui/ScoreBreakdownChart";
import { StatusTimeline } from "@/components/ui/StatusTimeline";
import { SignalCard } from "@/components/cards/SignalCard";
import { useRecommendationDrawerViewModel } from "./useRecommendationDrawerViewModel";

export function RecommendationDrawer() {
  const {
    open,
    close,
    selected,
    linkedSignals,
    entries,
    handleApprove,
    handleReject,
    handleSendToBoard,
    handleAskAI,
  } = useRecommendationDrawerViewModel();

  if (!selected) return null;

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


