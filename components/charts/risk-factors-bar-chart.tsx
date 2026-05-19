"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";
import type { RiskFactor } from "@/types";

function barColor(score: number) {
  if (score >= 65) return "#ef4444";
  if (score >= 50) return "#f59e0b";
  return "#3b82f6";
}

export function RiskFactorsBarChart({ factors }: { factors: RiskFactor[] }) {
  const data = factors.map((f) => ({ name: f.name, score: f.score, trend: f.trend }));
  return (
    <ChartResponsive height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
            stroke="var(--muted-foreground)"
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <Tooltip
            formatter={(value) => [`${value ?? ""}`, "Score"]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)"}}
          />
          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
            {data.map((e, i) => (
              <Cell key={`c-${i}`} fill={barColor(e.score)} />
            ))}
          </Bar>
        </BarChart>
    </ChartResponsive>
  );
}
