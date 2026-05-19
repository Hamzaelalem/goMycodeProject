"use client";

import {  PolarAngleAxis,  PolarGrid,  PolarRadiusAxis,  Radar,  RadarChart,  Tooltip } from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";
import type { Recommendation } from "@/types";

export function ScoreBreakdownChart({ recommendation }: { recommendation: Recommendation }) {
  const data = recommendation.scoreBreakdown.map((s) => ({ dimension: s.dimension, value: s.score }));
  return (
    <ChartResponsive height={260}>
        <RadarChart data={data} outerRadius="76%">
          <PolarGrid className="stroke-muted" />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Radar dataKey="value" stroke="#378ADD" fill="#378ADD" fillOpacity={0.22} />
          <Tooltip />
        </RadarChart>
    </ChartResponsive>
  );
}

