"use client";

import { useMemo } from "react";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

export function useRiskViewModel() {
  const activeRiskFactor = useGlobalStore((s) => s.activeRiskFactor);
  const selected = useGlobalStore((s) => s.selectedRecommendation);
  const riskFactorScores = useGlobalStore((s) => s.riskFactorScores);

  const factors = useMemo(() => {
    if (!selected) return riskFactorScores;
    return riskFactorScores.map((r) => ({
      ...r,
      score: selected.riskFactors.includes(r.name) ? Math.min(100, r.score + 8) : r.score,
    }));
  }, [selected, riskFactorScores]);

  const stats = useMemo(() => {
    const critical = factors.filter((f) => f.score >= 75).length;
    const high = factors.filter((f) => f.score >= 60 && f.score < 75).length;
    const avg = Math.round(factors.reduce((a, f) => a + f.score, 0) / factors.length);
    const avgPrev = Math.round(factors.reduce((a, f) => a + f.previousScore, 0) / factors.length);
    const trendValue = avg - avgPrev;
    const trendText = `${trendValue >= 0 ? "+" : ""}${trendValue}`;

    return {
      critical,
      high,
      avg,
      trendText,
    };
  }, [factors]);

  return {
    activeRiskFactor,
    factors,
    stats,
  };
}
