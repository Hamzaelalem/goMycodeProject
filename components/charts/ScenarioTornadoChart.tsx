"use client";

import { Bar, BarChart, Cell, CartesianGrid, LabelList, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";
import type { SensitivityBar } from "@/lib/scenarios/compute";

/**
 * Tornado chart: each factor's base-case IRR span from its low to high perturbation,
 * ordered by impact. Bars are drawn as a transparent offset + visible span so they float
 * around the centerline (current base-case IRR).
 */
export function ScenarioTornadoChart({
  bars,
  centerline,
}: {
  bars: SensitivityBar[];
  centerline: number;
}) {
  const data = bars.map((b) => {
    const start = Math.min(b.low, b.high);
    const end = Math.max(b.low, b.high);
    return {
      label: b.label,
      offset: start,
      span: end - start,
      positive: b.swing >= 0,
      swing: b.swing,
    };
  });

  return (
    <ChartResponsive height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
        <XAxis type="number" domain={["dataMin - 1", "dataMax + 1"]} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(_v, _n, item) => {
            const p = item?.payload as { swing: number } | undefined;
            return [`${p ? (p.swing >= 0 ? "+" : "") + p.swing : ""} pp IRR swing`, "Impact"];
          }}
        />
        <ReferenceLine x={centerline} stroke="#94a3b8" strokeDasharray="4 4" />
        <Bar dataKey="offset" stackId="t" fill="transparent" />
        <Bar dataKey="span" stackId="t" radius={2}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.positive ? "#1D9E75" : "#E24B4A"} />
          ))}
          <LabelList dataKey="swing" position="right" fontSize={11} formatter={(v) => { const n = Number(v); return `${n >= 0 ? "+" : ""}${n}`; }} />
        </Bar>
      </BarChart>
    </ChartResponsive>
  );
}
