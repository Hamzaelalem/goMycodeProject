"use client";

import {  Cell,  Legend,  Pie,  PieChart,  Tooltip } from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";
import type { EsgBreakdown } from "@/types";

const COLORS = {
  environmental: "#22c55e",
  social: "#3b82f6",
  governance: "#94a3b8"};

export function EsgBreakdownChart({ data }: { data: EsgBreakdown }) {
  const chartData = [
    { name: "Environmental", value: data.environmental, key: "environmental" as const },
    { name: "Social", value: data.social, key: "social" as const },
    { name: "Governance", value: data.governance, key: "governance" as const },
  ];

  return (
    <ChartResponsive height={260}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={56}
            outerRadius={84}
            paddingAngle={2}
          >
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${value ?? ""}`, "Score"]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)"}}
          />
          <Legend verticalAlign="bottom" height={28} />
        </PieChart>
    </ChartResponsive>
  );
}
