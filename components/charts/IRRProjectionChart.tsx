"use client";

import {  CartesianGrid,  Legend,  Line,  LineChart,  Tooltip,  XAxis,  YAxis } from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";
import type { IrrProjectionPoint } from "@/types";

export function IRRProjectionChart({
  data,
  comparedNames = [],
  labelMap = {},
}: {
  data: IrrProjectionPoint[];
  comparedNames?: string[];
  labelMap?: Record<string, string>;
}) {
  const overlayColors = ["#BA73FF", "#FFA632", "#13C6D6", "#FF56A5", "#7BE316"];

  return (
    <ChartResponsive height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line dataKey="base" stroke="#378ADD" strokeWidth={2} dot={false} name="Base (Active)" />
          <Line dataKey="bull" stroke="#1D9E75" dot={false} name="Bull (Active)" />
          <Line dataKey="bear" stroke="#BA7517" dot={false} name="Bear (Active)" />
          <Line dataKey="stress" stroke="#E24B4A" dot={false} name="Stress (Active)" />
          {comparedNames.map((name, i) => (
            <Line
              key={name}
              dataKey={name}
              stroke={overlayColors[i % overlayColors.length]}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              name={`${labelMap[name] ?? name} (Base)`}
            />
          ))}
        </LineChart>
    </ChartResponsive>
  );
}

