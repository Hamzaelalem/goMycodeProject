"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartResponsive } from "@/components/charts/chart-gate";
import type { ScenarioProjectionPoint } from "@/types";

export function IrrProjectionChart({ data }: { data: ScenarioProjectionPoint[] }) {
  return (
    <ChartResponsive height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)"}}
          />
          <Legend />
          <Line type="monotone" dataKey="irr" name="IRR %" stroke="#22c55e" strokeWidth={2} dot />
        </LineChart>
    </ChartResponsive>
  );
}

export function AumProjectionChart({ data }: { data: ScenarioProjectionPoint[] }) {
  return (
    <ChartResponsive height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)"}}
          />
          <Legend />
          <Line type="monotone" dataKey="aum" name="AUM ($M)" stroke="#3b82f6" strokeWidth={2} dot />
        </LineChart>
    </ChartResponsive>
  );
}

export function RiskScoreChart({ data }: { data: ScenarioProjectionPoint[] }) {
  return (
    <ChartResponsive height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)"}}
          />
          <Legend />
          <Line type="monotone" dataKey="risk" name="Risk score" stroke="#ef4444" strokeWidth={2} dot />
        </LineChart>
    </ChartResponsive>
  );
}
