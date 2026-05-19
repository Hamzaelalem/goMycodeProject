"use client";

import {  Bar,  BarChart,  CartesianGrid,  Legend,  Tooltip,  XAxis,  YAxis } from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";
import type { ScenarioCard } from "@/types";

export function ScenarioComparisonChart({ cards }: { cards: ScenarioCard[] }) {
  return (
    <ChartResponsive height={300}>
        <BarChart data={cards}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="portfolioIrrPct" name="IRR %" fill="#378ADD" />
          <Bar yAxisId="right" dataKey="projectedAumB" name="AUM $B" fill="#1D9E75" />
        </BarChart>
    </ChartResponsive>
  );
}

