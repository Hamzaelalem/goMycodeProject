"use client";

import { Check } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { TimeAgo } from "@/components/ui/time-ago";
import type { WorkflowLogEntry, WorkflowStatus } from "@/types";

const STEPS: WorkflowStatus[] = [
  "PENDING_REVIEW",
  "UNDER_REVIEW",
  "APPROVED",
  "EXECUTED",
];

function statusIndex(status: WorkflowStatus): number {
  if (status === "REJECTED") return 2;
  const i = STEPS.indexOf(status);
  return i < 0 ? 0 : i;
}

export function StatusTimeline({
  currentStatus,
  entries,
}: {
  currentStatus: WorkflowStatus;
  entries: WorkflowLogEntry[];
}) {
  const idx = statusIndex(currentStatus);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((step, i) => {
          const done = i < idx;
          const active = i === idx && currentStatus !== "REJECTED";
          return (
            <div key={step} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-medium",
                  done && "border-[#1D9E75] bg-[#EAF3DE] text-[#27500A]",
                  active && "border-[#378ADD] bg-[#E6F1FB] text-[#0C447C]",
                  !done && !active && "border-border bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className="text-xs text-muted-foreground">{step.toLowerCase().replaceAll("_", " ")}</span>
              {i < STEPS.length - 1 ? <span className="text-muted-foreground">→</span> : null}
            </div>
          );
        })}
        {currentStatus === "REJECTED" ? <StatusBadge kind="workflow" value="REJECTED" /> : null}
      </div>

      <ol className="space-y-4">
        {entries.map((e) => (
          <li key={e.id} className="border-l border-border pl-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{e.actor}</p>
              <StatusBadge kind="workflow" value={e.status} />
              <span className="text-xs text-muted-foreground">{e.role}</span>
              <TimeAgo iso={e.timestamp} className="text-xs text-muted-foreground" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{e.comment}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

