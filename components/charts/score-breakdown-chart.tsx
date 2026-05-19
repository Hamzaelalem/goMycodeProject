"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";
import type { ScoreBreakdown } from "@/types";

export function ScoreBreakdownChart({ rows }: { rows: ScoreBreakdown[] }) {
  return (
    <ChartResponsive height={200}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)"}}
          />
          <Bar dataKey="value" name="Score" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
    </ChartResponsive>
  );
}
