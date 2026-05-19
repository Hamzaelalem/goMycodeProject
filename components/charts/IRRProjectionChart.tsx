"use client";

import {  CartesianGrid,  Legend,  Line,  LineChart,  Tooltip,  XAxis,  YAxis } from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";
import type { IrrProjectionPoint } from "@/types";

export function IRRProjectionChart({ data }: { data: IrrProjectionPoint[] }) {
  return (
    <ChartResponsive height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line dataKey="base" stroke="#378ADD" dot={false} />
          <Line dataKey="bull" stroke="#1D9E75" dot={false} />
          <Line dataKey="bear" stroke="#BA7517" dot={false} />
          <Line dataKey="stress" stroke="#E24B4A" dot={false} />
        </LineChart>
    </ChartResponsive>
  );
}

