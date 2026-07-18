"use client";

import { useMemo } from "react";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

export function useDashboardViewModel() {
  const recs = useGlobalStore((s) => s.recommendations);
  const signals = useGlobalStore((s) => s.signals);
  const riskFactorScores = useGlobalStore((s) => s.riskFactorScores);
  const esgSectors = useGlobalStore((s) => s.esgSectors);

  const topRecs = useMemo(() => {
    return [...recs].sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }, [recs]);

  const riskLine = useMemo(() => {
    const days = ["D1", "D2", "D3", "D4", "D5", "D6", "D7"];
    const n = Math.max(1, riskFactorScores.length);
    return days.map((day, i) => ({
      day,
      score: Math.round(
        riskFactorScores.reduce((acc, f) => acc + (f.sparklineData[i] ?? f.score), 0) / n,
      ),
    }));
  }, [riskFactorScores]);

  const kpis = useMemo(() => {
    const totalRecommendations = recs.length;
    const avgConfidence = Math.round(
      recs.reduce((a, r) => a + r.confidence, 0) / Math.max(1, recs.length),
    );
    const portfolioRisk = Math.round(
      riskFactorScores.reduce((a, r) => a + r.score, 0) / Math.max(1, riskFactorScores.length),
    );
    const esgScore = Math.round(
      esgSectors.reduce((a, e) => a + e.scores.overall, 0) / Math.max(1, esgSectors.length),
    );

    return {
      totalRecommendations,
      avgConfidence,
      portfolioRisk,
      esgScore,
    };
  }, [recs, riskFactorScores, esgSectors]);

  const liveFeedPreview = useMemo(() => {
    return signals.slice(0, 3);
  }, [signals]);

  return {
    kpis,
    riskLine,
    esgSectors,
    topRecs,
    liveFeedPreview,
  };
}
