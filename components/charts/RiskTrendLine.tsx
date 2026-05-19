"use client";

import {  CartesianGrid,  Line,  LineChart,  Tooltip,  XAxis,  YAxis } from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";

export function RiskTrendLine({ points }: { points: Array<{ day: string; score: number }> }) {
  return (
    <ChartResponsive height={240}>
        <LineChart data={points}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="day" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line dataKey="score" stroke="#E24B4A" strokeWidth={2} dot={false} />
        </LineChart>
    </ChartResponsive>
  );
}

