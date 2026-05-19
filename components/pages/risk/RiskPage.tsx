"use client";

import { useMemo } from "react";

import { KPICard } from "@/components/cards/KPICard";
import { RiskFactorRow } from "@/components/cards/RiskFactorRow";
import { RiskRadarChart } from "@/components/charts/RiskRadarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

export default function RiskPage() {
  const activeRiskFactor = useGlobalStore((s) => s.activeRiskFactor);
  const selected = useGlobalStore((s) => s.selectedRecommendation);
  const riskFactorScores = useGlobalStore((s) => s.riskFactorScores);
  const factors = useMemo(() => {
    if (!selected) return riskFactorScores;
    return riskFactorScores.map((r) => ({
      ...r,
      score: selected.riskFactors.includes(r.name) ? Math.min(100, r.score + 8) : r.score,
    }));
  }, [selected, riskFactorScores]);
  const critical = factors.filter((f) => f.score >= 75).length;
  const high = factors.filter((f) => f.score >= 60 && f.score < 75).length;
  const avg = Math.round(factors.reduce((a, f) => a + f.score, 0) / factors.length);
  const avgPrev = Math.round(factors.reduce((a, f) => a + f.previousScore, 0) / factors.length);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <KPICard label="Critical" value={`${critical}`} />
        <KPICard label="High" value={`${high}`} />
        <KPICard label="Portfolio score" value={`${avg}`} />
        <KPICard label="7-day trend" value={`${avg - avgPrev >= 0 ? "+" : ""}${avg - avgPrev}`} />
      </div>
      <div className="grid gap-3 lg:grid-cols-[55%_45%]">
        <div className="space-y-2">
          {factors.map((f) => (
            <div key={f.id} className={activeRiskFactor === f.name ? "ring-2 ring-ring rounded-xl" : ""}>
              <RiskFactorRow factor={f} />
            </div>
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>Risk radar</CardTitle></CardHeader>
          <CardContent><RiskRadarChart factors={factors} /></CardContent>
        </Card>
      </div>
    </div>
  );
}

