"use client";

import {  Bar,  BarChart,  CartesianGrid,  Legend,  Tooltip,  XAxis,  YAxis } from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";
import type { EsgSectorInputs } from "@/types";

export function ESGBarChart({
  sectors,
  onSelectSector}: {
  sectors: EsgSectorInputs[];
  onSelectSector?: (sector: string) => void;
}) {
  const data = sectors.map((s) => ({
    sector: s.sector,
    E: s.scores.E,
    S: s.scores.S,
    G: s.scores.G}));
  return (
    <ChartResponsive height={320}>
        <BarChart data={data} layout="vertical" onClick={(s) => {
          const maybe = s?.activeLabel;
          if (typeof maybe === "string") onSelectSector?.(maybe);
        }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" domain={[0, 100]} />
          <YAxis type="category" dataKey="sector" width={100} />
          <Tooltip />
          <Legend />
          <Bar dataKey="E" stackId="a" fill="#1D9E75" />
          <Bar dataKey="S" stackId="a" fill="#378ADD" />
          <Bar dataKey="G" stackId="a" fill="#7C3AED" />
        </BarChart>
    </ChartResponsive>
  );
}

