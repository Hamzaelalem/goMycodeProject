"use client";

import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { computeScenariosApi } from "@/lib/api/mutations";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import {
  DEFAULT_INPUTS,
  baseFromPortfolio,
  computeScenarioBundle,
  type ScenarioBundle,
} from "@/lib/scenarios/compute";
import type { ScenarioInputs } from "@/types";

const round1 = (n: number) => Math.round(n * 10) / 10;

export function useMarketIntelligenceViewModel() {
  const portfolio = useGlobalStore((s) => s.portfolio);
  const [inputs, setInputs] = useState<ScenarioInputs>(DEFAULT_INPUTS);
  const debounced = useDebounce(inputs, 150);

  const base = useMemo(() => baseFromPortfolio(portfolio), [portfolio]);

  // Baseline (default macro assumptions) to measure the impact of the current assumptions.
  const baseline = useMemo(() => computeScenarioBundle(DEFAULT_INPUTS, base), [base]);
  // Instant client compute keeps the simulator responsive while the server catches up.
  const clientBundle = useMemo(() => computeScenarioBundle(debounced, base), [debounced, base]);

  // Authoritative server-side computation (the real computation backend).
  const computeKey = useMemo(() => JSON.stringify(debounced), [debounced]);
  const [server, setServer] = useState<{ key: string; bundle: ScenarioBundle } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    computeScenariosApi(debounced, undefined, controller.signal).then((res) => {
      if (res) setServer({ key: computeKey, bundle: res });
    });
    return () => controller.abort();
  }, [computeKey, debounced]);

  const usingServer = server?.key === computeKey;
  const bundle = usingServer ? server!.bundle : clientBundle;

  const baseCard = bundle.cards.find((c) => c.id === "base");
  const baselineBase = baseline.cards.find((c) => c.id === "base");

  const impact = {
    irrDelta: round1((baseCard?.portfolioIrrPct ?? 0) - (baselineBase?.portfolioIrrPct ?? 0)),
    aumDelta: round1((baseCard?.projectedAumB ?? 0) - (baselineBase?.projectedAumB ?? 0)),
    riskDelta: Math.round((baseCard?.riskScore ?? 0) - (baselineBase?.riskScore ?? 0)),
    expectedDelta: round1(bundle.expectedIrr - baseline.expectedIrr),
  };

  function setValue<K extends keyof ScenarioInputs>(k: K, value: number) {
    setInputs((prev) => ({ ...prev, [k]: value }));
  }

  function resetInputs() {
    setInputs(DEFAULT_INPUTS);
  }

  return {
    portfolio,
    inputs,
    setValue,
    resetInputs,
    cards: bundle.cards,
    projection: bundle.projection,
    expectedIrrPct: bundle.expectedIrr,
    baseCard,
    impact,
    source: usingServer ? "server" : "preview",
  };
}
