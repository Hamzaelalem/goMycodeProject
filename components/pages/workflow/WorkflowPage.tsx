"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { StatusTimeline } from "@/components/ui/StatusTimeline";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import type { WorkflowStatus } from "@/types";

function mapStatus(s: string): WorkflowStatus {
  if (s === "pending_review") return "PENDING_REVIEW";
  if (s === "under_review") return "UNDER_REVIEW";
  if (s === "approved") return "APPROVED";
  if (s === "rejected") return "REJECTED";
  return "EXECUTED";
}

export default function WorkflowPage() {
  const workflowLogEntries = useGlobalStore((s) => s.workflowLogEntries);
  const recs = useGlobalStore((s) => s.recommendations);
  const focusId = useGlobalStore((s) => s.workflowFocusRecommendationId);
  const setWorkflowFocusRecommendationId = useGlobalStore((s) => s.setWorkflowFocusRecommendationId);
  const openAIDrawer = useGlobalStore((s) => s.openAIDrawer);
  const updateRecommendationStatus = useGlobalStore((s) => s.updateRecommendationStatus);
  const [selectedId, setSelectedId] = useState(recs[0]?.id ?? "");
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!focusId) return;
    const exists = recs.some((r) => r.id === focusId);
    if (!exists) {
      setWorkflowFocusRecommendationId(null);
      return;
    }
    setSelectedId(focusId);
    const id = focusId;
    requestAnimationFrame(() => {
      rowRefs.current[id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      setWorkflowFocusRecommendationId(null);
    });
  }, [focusId, recs, setWorkflowFocusRecommendationId]);
  const [comment, setComment] = useState("");
  const current = recs.find((r) => r.id === selectedId);
  const entries = useMemo(
    () => workflowLogEntries.filter((w) => w.recommendationId === selectedId),
    [selectedId, workflowLogEntries],
  );
  const pending = recs.filter((r) => r.status === "pending_review").length;
  const approved = recs.filter((r) => r.status === "approved").length;
  const rejected = recs.filter((r) => r.status === "rejected").length;

  if (!recs.length) {
    return <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">All recommendations reviewed ✓</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <Card><CardContent className="p-3 text-sm">Total {recs.length}</CardContent></Card>
        <Card><CardContent className="p-3 text-sm">Pending {pending}</CardContent></Card>
        <Card><CardContent className="p-3 text-sm">Approved {approved}</CardContent></Card>
        <Card><CardContent className="p-3 text-sm">Rejected {rejected}</CardContent></Card>
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
                <Button variant="secondary" onClick={() => openAIDrawer("What should I consider before approving this recommendation?")}>
                  Get AI input ↗
                </Button>
                {current ? (
                  <>
                    <Button onClick={() => updateRecommendationStatus(current.id, "approved", comment)}>Approve</Button>
                    <Button variant="destructive" onClick={() => updateRecommendationStatus(current.id, "rejected", comment)}>Reject</Button>
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

