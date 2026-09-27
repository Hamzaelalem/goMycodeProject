"use client";

import { StatusTimeline } from "@/components/ui/StatusTimeline";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkflowViewModel, mapStatus } from "./useWorkflowViewModel";

export default function WorkflowPage() {
  const {
    recs,
    setSelectedId,
    comment,
    setComment,
    rowRefs,
    current,
    entries,
    kpis,
    handleApprove,
    handleReject,
    handleGetAIInput,
  } = useWorkflowViewModel();

  if (!recs.length) {
    return <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">All recommendations reviewed ✓</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <Card><CardContent className="p-3 text-sm">Total {kpis.total}</CardContent></Card>
        <Card><CardContent className="p-3 text-sm">Pending {kpis.pending}</CardContent></Card>
        <Card><CardContent className="p-3 text-sm">Approved {kpis.approved}</CardContent></Card>
        <Card><CardContent className="p-3 text-sm">Rejected {kpis.rejected}</CardContent></Card>
        <Card><CardContent className="p-3 text-sm">Avg approval: 2.4d</CardContent></Card>
      </div>
      <div className="grid gap-3 lg:grid-cols-[35%_65%]">
        <Card>
          <CardHeader><CardTitle>Queue</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recs.map((r) => (
              <button
                key={r.id}
                ref={(el) => {
                  rowRefs.current[r.id] = el;
                }}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className="flex w-full items-center justify-between rounded-lg border border-border p-2 text-left"
              >
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.confidence}% · {r.region}</p>
                </div>
                <StatusBadge kind="workflow" value={mapStatus(r.status)} />
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {current ? <StatusTimeline currentStatus={mapStatus(current.status)} entries={entries} /> : null}
            <div className="space-y-2 rounded-xl border border-border p-3">
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment…" />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleGetAIInput}>
                  Get AI input ↗
                </Button>
                {current ? (
                  <>
                    <Button onClick={handleApprove}>Approve</Button>
                    <Button variant="destructive" onClick={handleReject}>Reject</Button>
                  </>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


