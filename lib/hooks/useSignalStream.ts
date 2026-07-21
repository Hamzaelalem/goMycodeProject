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
    sector: "Solar & Energy",
    region: "Europe",
    country: "ES",
  },
  {
    title: "Risk alert: operational incident chatter increases",
    body: "Social volume uptick; check incident details and mitigation timeline.",
    type: "risk",
    severity: "high",
    sector: "Logistics",
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
  const consecutiveFailures = useRef(0);
  const stableTemplates = useMemo(() => TEMPLATES, []);

  useEffect(() => {
    if (!enabled) return;

    const addIfNew = (s: Signal) => {
      const ids = new Set(useGlobalStore.getState().signals.map((x) => x.id));
      if (!ids.has(s.id)) addSignal(s);
    };

    const makeSyntheticSignal = (): Signal => {
      const tpl = randomFrom(stableTemplates);
      const type = tpl.type;
      return {
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
    };

    // ── Polling fallback (used only when SSE cannot be established) ───────────
    let pollId: number | null = null;

    const tick = async () => {
      // Don't poll while the tab is hidden — saves DB round-trips and battery.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

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
        consecutiveFailures.current = 0;
        const sorted = [...rows].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        // Build the dedup set once, then track ids added this batch.
        const seen = new Set(useGlobalStore.getState().signals.map((x) => x.id));
        for (const s of sorted) {
          if (!seen.has(s.id)) {
            addSignal(s);
            seen.add(s.id);
          }
        }
      } catch {
        consecutiveFailures.current += 1;
        // Synthesize a signal when the API has never worked (offline dev) or a
        // sustained outage begins mid-session (2+ consecutive failures), so the
        // feed keeps moving instead of going silent. A single transient blip on
        // an otherwise-live feed is ignored to avoid mixing in fake data.
        if (!apiPollSucceeded.current || consecutiveFailures.current >= 2) {
          addSignal(makeSyntheticSignal());
        }
      }
    };

    const startPolling = () => {
      if (pollId !== null) return;
      void tick();
      pollId = window.setInterval(() => {
        void tick();
      }, intervalMs);
    };

    const stopPolling = () => {
      if (pollId !== null) {
        window.clearInterval(pollId);
        pollId = null;
      }
    };

    // Poll immediately when returning to the tab (only relevant in poll mode).
    const onVisibility = () => {
      if (document.visibilityState === "visible" && pollId !== null) void tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // ── SSE primary transport ────────────────────────────────────────────────
    let es: EventSource | null = null;
    let opened = false;
    let openTimer: number | null = null;

    const startSse = () => {
      if (typeof EventSource === "undefined") {
        startPolling();
        return;
      }
      try {
        es = new EventSource("/api/signals/stream");
      } catch {
        startPolling();
        return;
      }

      // If the connection doesn't open promptly, fall back to polling.
      openTimer = window.setTimeout(() => {
        if (!opened) {
          es?.close();
          es = null;
          startPolling();
        }
      }, 4_000);

      es.onopen = () => {
        opened = true;
        apiPollSucceeded.current = true;
        if (openTimer !== null) {
          window.clearTimeout(openTimer);
          openTimer = null;
        }
        // SSE is authoritative — ensure we're not also polling.
        stopPolling();
      };

      es.addEventListener("signal", (ev) => {
        try {
          addIfNew(JSON.parse((ev as MessageEvent).data) as Signal);
        } catch {
          // ignore malformed event
        }
      });

      es.onerror = () => {
        // EventSource auto-reconnects once opened; only fall back if it never
        // connected (route missing / server unreachable).
        if (!opened) {
          if (openTimer !== null) {
            window.clearTimeout(openTimer);
            openTimer = null;
          }
          es?.close();
          es = null;
          startPolling();
        }
      };
    };

    startSse();

    return () => {
      if (openTimer !== null) window.clearTimeout(openTimer);
      es?.close();
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [addSignal, enabled, intervalMs, stableTemplates]);
}
