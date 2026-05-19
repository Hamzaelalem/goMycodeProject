"use client";

import { useEffect, useMemo, useRef } from "react";

import { useGlobalStore } from "@/lib/store/useGlobalStore";
import type { Signal, SignalSeverity, SignalSource, SignalType } from "@/types";

const TEMPLATES: Array<Pick<Signal, "title" | "body" | "type" | "severity" | "sector" | "region" | "country">> = [
  {
    title: "Macro pulse: rates reprice after surprise print",
    body: "Short end volatility increases; revisit scenario sensitivities if moves persist.",
    type: "market",
    severity: "medium",
    sector: "Banking",
    region: "Europe",
    country: "DE",
  },
  {
    title: "Opportunity: PPA pipeline expands for Iberia solar",
    body: "Incremental offtake volumes improve forward visibility for Solar sleeve.",
    type: "opportunity",
    severity: "low",
    sector: "Solar",
    region: "Europe",
    country: "ES",
  },
  {
    title: "Risk alert: operational incident chatter increases",
    body: "Social volume uptick; check incident details and mitigation timeline.",
    type: "risk",
    severity: "high",
    sector: "Industrials",
    region: "APAC",
    country: "SG",
  },
];

const SOURCES: SignalSource[] = ["bloomberg", "talkwalker", "internal"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomSentiment(type: SignalType): number {
  if (type === "opportunity") return 0.25 + Math.random() * 0.35;
  if (type === "risk") return -(0.25 + Math.random() * 0.5);
  return (Math.random() - 0.5) * 0.3;
}

function severityFor(type: SignalType): SignalSeverity {
  if (type === "risk" && Math.random() > 0.75) return "critical";
  if (type === "risk") return "high";
  if (type === "policy") return "medium";
  return Math.random() > 0.7 ? "medium" : "low";
}

function latestSignalTimestampIso(signals: Signal[]): string {
  if (!signals.length) return new Date(0).toISOString();
  let max = signals[0]!.timestamp;
  for (const s of signals) {
    if (new Date(s.timestamp).getTime() > new Date(max).getTime()) max = s.timestamp;
  }
  return max;
}

export function useSignalStream(enabled = true, intervalMs = 30_000) {
  const addSignal = useGlobalStore((s) => s.addSignal);
  const counter = useRef(1000);
  const apiPollSucceeded = useRef(false);
  const stableTemplates = useMemo(() => TEMPLATES, []);

  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      const snap = useGlobalStore.getState();
      const after = latestSignalTimestampIso(snap.signals);
      try {
        const res = await fetch(
          `/api/signals?after=${encodeURIComponent(after)}&limit=15`,
        );
        if (!res.ok) throw new Error("poll failed");
        const rows = (await res.json()) as Signal[];
        if (!Array.isArray(rows)) throw new Error("bad shape");
        apiPollSucceeded.current = true;
        const sorted = [...rows].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        for (const s of sorted) {
          const ids = new Set(useGlobalStore.getState().signals.map((x) => x.id));
          if (!ids.has(s.id)) addSignal(s);
        }
      } catch {
        if (!apiPollSucceeded.current) {
          const tpl = randomFrom(stableTemplates);
          const type = tpl.type;
          const signal: Signal = {
            id: `stream-${counter.current++}`,
            title: tpl.title,
            body: tpl.body,
            type,
            severity: severityFor(type),
            sentiment: randomSentiment(type),
            reach: Math.round(Math.random() * 250_000),
            timestamp: new Date().toISOString(),
            source: randomFrom(SOURCES),
            country: tpl.country,
            region: tpl.region,
            sector: tpl.sector,
          };
          addSignal(signal);
        }
      }
    };

    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [addSignal, enabled, intervalMs, stableTemplates]);
}
