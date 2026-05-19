"use client";

import { Eye, X } from "lucide-react";

import { ConfidenceGauge } from "@/components/ui/ConfidenceGauge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TimeAgo } from "@/components/ui/time-ago";
import { formatCurrencyCompact, formatPct } from "@/lib/utils/formatters";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import type { Recommendation } from "@/types";

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const openRecommendationDrawer = useGlobalStore((s) => s.openRecommendationDrawer);
  const updateRecommendationStatus = useGlobalStore((s) => s.updateRecommendationStatus);

  return (
    <Card className="rounded-xl border shadow-none">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">#{rec.rank}</p>
            <p className="text-sm font-medium">{rec.title}</p>
            <p className="text-xs text-muted-foreground">{rec.region}</p>
          </div>
          <ConfidenceGauge value={rec.confidence} />
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge kind="workflow" value={rec.status === "pending_review" ? "PENDING_REVIEW" : rec.status === "under_review" ? "UNDER_REVIEW" : rec.status === "approved" ? "APPROVED" : "REJECTED"} />
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{rec.sector}</span>
          {rec.tags.slice(0, 2).map((t) => (
            <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{t}</span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>Capital: {formatCurrencyCompact(rec.capitalUsd)}</div>
          <div>IRR: {formatPct(rec.irrPct, 1)}</div>
          <div>Horizon: {rec.horizonYears}y</div>
          <div>Risk: {rec.riskLevel}</div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{rec.modelVersion}</span>
          <TimeAgo iso={rec.generatedAt} />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => openRecommendationDrawer(rec)}>
            <Eye className="h-3.5 w-3.5" /> Review
          </Button>
          <Button size="sm" onClick={() => updateRecommendationStatus(rec.id, "approved")}>
            Approve
          </Button>
          <Button variant="destructive" size="sm" onClick={() => updateRecommendationStatus(rec.id, "rejected")}>
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

