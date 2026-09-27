"use client";

import { useMemo, useState } from "react";

import { scanAndRebalanceApi } from "@/lib/api/mutations";
import { simulateRebalance, type RebalanceAction, type RebalanceResponse } from "@/lib/sentinel/rebalance";

export function usePortfolioSentinelViewModel() {
  const [result, setResult] = useState<RebalanceResponse | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedOff, setSignedOff] = useState(false);
  const [appliedWeights, setAppliedWeights] = useState<Record<string, number> | null>(null);
  const [appliedAt, setAppliedAt] = useState<string | null>(null);

  async function scan() {
    setScanning(true);
    setError(null);
    try {
      const response = await scanAndRebalanceApi();
      if (!response.success || !response.data) {
        setError(response.error ?? "Scan failed");
        return;
      }
      setResult(response.data);
      // A new scan invalidates any previous human sign-off.
      setSignedOff(false);
      setAppliedWeights(null);
      setAppliedAt(null);
    } finally {
      setScanning(false);
    }
  }

  function applySimulatedRebalance() {
    if (!result || !signedOff) return;
    setAppliedWeights(simulateRebalance(result.assets));
    setAppliedAt(new Date().toISOString());
  }

  function resetSimulation() {
    setAppliedWeights(null);
    setAppliedAt(null);
    setSignedOff(false);
  }

  const counts = useMemo(() => {
    const base: Record<RebalanceAction, number> = { BUY: 0, SELL: 0, HOLD: 0 };
    for (const asset of result?.assets ?? []) base[asset.directive.action] += 1;
    return base;
  }, [result]);

  const actionable = counts.BUY + counts.SELL;

  return {
    result,
    scanning,
    error,
    signedOff,
    setSignedOff,
    appliedWeights,
    appliedAt,
    counts,
    actionable,
    scan,
    applySimulatedRebalance,
    resetSimulation,
  };
}
