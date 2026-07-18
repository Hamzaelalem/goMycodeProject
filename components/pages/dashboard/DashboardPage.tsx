"use client";

import { KPICard } from "@/components/cards/KPICard";
import { RiskTrendLine } from "@/components/charts/RiskTrendLine";
import { ESGBarChart } from "@/components/charts/ESGBarChart";
import { RecommendationCard } from "@/components/cards/RecommendationCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardViewModel } from "./useDashboardViewModel";

export default function DashboardPage() {
  const { kpis, riskLine, esgSectors, topRecs, liveFeedPreview } = useDashboardViewModel();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <KPICard label="Total recommendations" value={`${kpis.totalRecommendations}`} />
        <KPICard label="Avg confidence" value={`${kpis.avgConfidence}%`} />
        <KPICard label="Portfolio risk" value={`${kpis.portfolioRisk}`} />
        <KPICard label="ESG score" value={`${kpis.esgScore}`} />
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
          {liveFeedPreview.map((s) => (
            <p key={s.id} className="truncate">• {s.title}</p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}


