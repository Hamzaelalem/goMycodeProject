"use client";

import {  PolarAngleAxis,  PolarGrid,  PolarRadiusAxis,  Radar,  RadarChart,  Tooltip,  Legend } from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";
import type { RiskFactorScore } from "@/types";

export function RiskRadarChart({ factors }: { factors: RiskFactorScore[] }) {
  const data = factors.map((f) => ({
    factor: f.name,
    current: f.score,
    previous: f.previousScore}));

  return (
    <ChartResponsive height={310}>
        <RadarChart data={data} outerRadius="74%">
          <PolarGrid className="stroke-muted" />
          <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Radar dataKey="previous" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.18} name="Previous week" />
          <Radar dataKey="current" stroke="#E24B4A" fill="#E24B4A" fillOpacity={0.28} name="Current week" />
          <Tooltip />
          <Legend />
        </RadarChart>
    </ChartResponsive>
  );
}

