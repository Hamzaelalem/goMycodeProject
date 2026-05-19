"use client";

import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import type { RiskFactorScore } from "@/types";

function trend(score: number, previous: number) {
  if (score > previous) return "up";
  if (score < previous) return "down";
  return "stable";
}

export function RiskFactorRow({ factor }: { factor: RiskFactorScore }) {
  const t = trend(factor.score, factor.previousScore);
  const setActiveRiskFactor = useGlobalStore((s) => s.setActiveRiskFactor);
  return (
    <button
      type="button"
      onClick={() => setActiveRiskFactor(factor.name)}
      className="w-full rounded-xl border border-border p-3 text-left"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{factor.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{factor.score}</span>
          {t === "up" ? <ArrowUp className="h-3.5 w-3.5 text-red-500" /> : t === "down" ? <ArrowDown className="h-3.5 w-3.5 text-emerald-500" /> : <ArrowRight className="h-3.5 w-3.5 text-blue-500" />}
        </div>
      </div>
      <Progress value={factor.score} />
      <div className="mt-2 flex items-center gap-2">
        <StatusBadge kind="severity" value={factor.score >= 75 ? "critical" : factor.score >= 60 ? "high" : factor.score >= 40 ? "medium" : "low"} />
        <span className="text-xs text-muted-foreground">{factor.source}</span>
      </div>
    </button>
  );
}

