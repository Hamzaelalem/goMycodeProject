"use client";

import { useMemo } from "react";

import { KPICard } from "@/components/cards/KPICard";
import { RiskTrendLine } from "@/components/charts/RiskTrendLine";
import { ESGBarChart } from "@/components/charts/ESGBarChart";
import { RecommendationCard } from "@/components/cards/RecommendationCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

export default function DashboardPage() {
  const recs = useGlobalStore((s) => s.recommendations);
  const signals = useGlobalStore((s) => s.signals);
  const riskFactorScores = useGlobalStore((s) => s.riskFactorScores);
  const esgSectors = useGlobalStore((s) => s.esgSectors);
  const topRecs = useMemo(() => [...recs].sort((a, b) => b.confidence - a.confidence).slice(0, 3), [recs]);
  const riskLine = useMemo(() => {
    const days = ["D1", "D2", "D3", "D4", "D5", "D6", "D7"];
    const n = Math.max(1, riskFactorScores.length);
    return days.map((day, i) => ({
      day,
      score: Math.round(
        riskFactorScores.reduce((acc, f) => acc + (f.sparklineData[i] ?? f.score), 0) / n,
      ),
    }));
  }, [riskFactorScores]);

  const avgConfidence = Math.round(recs.reduce((a, r) => a + r.confidence, 0) / Math.max(1, recs.length));
  const avgIrr = (recs.reduce((a, r) => a + r.irrPct, 0) / Math.max(1, recs.length)).toFixed(1);
  const portfolioRisk = Math.round(
    riskFactorScores.reduce((a, r) => a + r.score, 0) / Math.max(1, riskFactorScores.length),
  );
  const esgScore = Math.round(
    esgSectors.reduce((a, e) => a + e.scores.overall, 0) / Math.max(1, esgSectors.length),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <KPICard label="Total recommendations" value={`${recs.length}`} />
        <KPICard label="Avg confidence" value={`${avgConfidence}%`} />
        <KPICard label="Portfolio risk" value={`${portfolioRisk}`} />
        <KPICard label="ESG score" value={`${esgScore}`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk trend</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <RiskTrendLine points={riskLine} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ESG breakdown by sector</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <ESGBarChart sectors={esgSectors} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {topRecs.map((r) => (
          <RecommendationCard key={r.id} rec={r} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live feed preview</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {signals.slice(0, 3).map((s) => (
            <p key={s.id} className="truncate">• {s.title}</p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

