"use client";

import { KPICard } from "@/components/cards/KPICard";
import { RiskFactorRow } from "@/components/cards/RiskFactorRow";
import { RiskRadarChart } from "@/components/charts/RiskRadarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRiskViewModel } from "./useRiskViewModel";

export default function RiskPage() {
  const { activeRiskFactor, factors, stats } = useRiskViewModel();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <KPICard label="Critical" value={`${stats.critical}`} />
        <KPICard label="High" value={`${stats.high}`} />
        <KPICard label="Portfolio score" value={`${stats.avg}`} />
        <KPICard label="7-day trend" value={stats.trendText} />
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


