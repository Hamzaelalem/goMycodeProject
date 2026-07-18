"use client";

import { Area, CartesianGrid, ComposedChart, Legend, Line, Tooltip, XAxis, YAxis } from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";
import type { McBandPoint } from "@/lib/scenarios/compute";

/**
 * Monte Carlo IRR envelope: shaded P10–P90 band with the P50 (median) line, aggregated
 * per projection year from randomized macro draws.
 */
export function ScenarioMonteCarloChart({ bands }: { bands: McBandPoint[] }) {
  const data = bands.map((b) => ({
    year: b.year,
    p10: b.p10,
    p50: b.p50,
    p90: b.p90,
    band: Math.round((b.p90 - b.p10) * 10) / 10,
  }));

  return (
    <ChartResponsive height={260}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="year" />
        <YAxis tickFormatter={(v) => `${v}%`} />
        <Tooltip
          formatter={(value, name) => {
            const labels: Record<string, string> = { p10: "P10", p50: "P50 (median)", p90: "P90" };
            return [`${value}%`, labels[String(name)] ?? String(name)];
          }}
          labelFormatter={(y) => `Year ${y}`}
        />
        <Legend />
        {/* Transparent base up to P10, then a translucent span of P90-P10 = shaded band. */}
        <Area dataKey="p10" stackId="mc" stroke="none" fill="transparent" legendType="none" name="P10" />
        <Area dataKey="band" stackId="mc" stroke="none" fill="#378ADD" fillOpacity={0.15} legendType="none" name="P10–P90" />
        <Line dataKey="p50" stroke="#378ADD" strokeWidth={2} dot={false} name="Median (P50)" />
      </ComposedChart>
    </ChartResponsive>
  );
}
