"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
} from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";
import type { RiskFactor } from "@/types";

export function RiskRadarChart({ factors }: { factors: RiskFactor[] }) {
  const data = factors.map((f) => ({ factor: f.name, score: f.score }));
  return (
    <ChartResponsive height={300}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="78%">
          <PolarGrid className="stroke-muted" />
          <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Radar
            name="Risk score"
            dataKey="score"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.35}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)"}}
          />
        </RadarChart>
    </ChartResponsive>
  );
}
