"use client";

import { useMemo, useState, useEffect } from "react";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

function generateLocalSummary(
  region: string | null,
  sector: string | null,
  kpis: { totalRecommendations: number; avgConfidence: number; portfolioRisk: number; esgScore: number },
  statusCounts: { approved: number; underReview: number; pendingReview: number; rejected: number }
) {
  const regName = region ?? "Global";
  const secName = sector ?? "all sectors";

  if (kpis.totalRecommendations === 0) {
    return `No investment recommendations are currently active under the ${regName} (${secName}) filter combination. Adjust filters to examine other parts of the pipeline.`;
  }

  let text = `The ${regName} portfolio focused on ${secName} comprises ${kpis.totalRecommendations} recommendations with an average confidence of ${kpis.avgConfidence}%. `;

  if (kpis.portfolioRisk > 70) {
    text += `Risk exposure is elevated at ${kpis.portfolioRisk}/100, heavily influenced by regional volatility and regulatory compliance burdens. `;
  } else if (kpis.portfolioRisk > 50) {
    text += `Risk exposure is moderate at ${kpis.portfolioRisk}/100, showing a balanced mix of defensive and growth asset classes. `;
  } else {
    text += `Risk levels are defensive and stable at ${kpis.portfolioRisk}/100, indicating low volatility and secure capital preservation. `;
  }

  if (kpis.esgScore > 75) {
    text += `ESG alignment is excellent with a score of ${kpis.esgScore}/100, driven by high environmental compliance and sustainable PPAs. `;
  } else if (kpis.esgScore > 50) {
    text += `ESG alignment is mid-range at ${kpis.esgScore}/100, leaving room for sustainability improvements. `;
  }

  if (statusCounts.approved > 0) {
    text += `With ${statusCounts.approved} recommendation(s) fully approved, the immediate pipeline is ready for execution phase.`;
  } else if (statusCounts.pendingReview > 0) {
    text += `There are ${statusCounts.pendingReview} recommendations pending executive review.`;
  }

  return text;
}

export function useDashboardViewModel() {
  const recs = useGlobalStore((s) => s.recommendations);
  const signals = useGlobalStore((s) => s.signals);
  const riskFactorScores = useGlobalStore((s) => s.riskFactorScores);
  const esgSectors = useGlobalStore((s) => s.esgSectors);

  const activeRegionFilter = useGlobalStore((s) => s.activeRegionFilter);
  const activeSectorFilter = useGlobalStore((s) => s.activeSectorFilter);
  const setActiveRegionFilter = useGlobalStore((s) => s.setActiveRegionFilter);
  const setActiveSectorFilter = useGlobalStore((s) => s.setActiveSectorFilter);

  // Available unique filters computed dynamically from data
  const availableRegions = useMemo(() => {
    return Array.from(new Set(recs.map((r) => r.region).filter(Boolean))).sort();
  }, [recs]);

  const availableSectors = useMemo(() => {
    return Array.from(new Set(recs.map((r) => r.sector).filter(Boolean))).sort();
  }, [recs]);

  // Recommendations filtered dynamically
  const filteredRecs = useMemo(() => {
    return recs.filter((r) => {
      if (activeRegionFilter && r.region !== activeRegionFilter) return false;
      if (activeSectorFilter && r.sector !== activeSectorFilter) return false;
      return true;
    });
  }, [recs, activeRegionFilter, activeSectorFilter]);

  const topRecs = useMemo(() => {
    return [...filteredRecs].sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }, [filteredRecs]);

  // Risk scores filtered dynamically (exact region match or Global)
  const filteredRiskScores = useMemo(() => {
    return riskFactorScores.filter((f) => {
      if (activeRegionFilter) {
        return f.region === "Global" || f.region === activeRegionFilter;
      }
      return true;
    });
  }, [riskFactorScores, activeRegionFilter]);

  // Risk trend line based on filtered risk scores
  const riskLine = useMemo(() => {
    const days = ["D1", "D2", "D3", "D4", "D5", "D6", "D7"];
    const n = Math.max(1, filteredRiskScores.length);
    return days.map((day, i) => ({
      day,
      score: Math.round(
        filteredRiskScores.reduce((acc, f) => acc + (f.sparklineData[i] ?? f.score), 0) / n,
      ),
    }));
  }, [filteredRiskScores]);

  // ESG sectors filtered dynamically
  const filteredEsgSectors = useMemo(() => {
    return esgSectors.filter((e) => {
      if (activeSectorFilter) {
        return e.sector === activeSectorFilter;
      }
      return true;
    });
  }, [esgSectors, activeSectorFilter]);

  // Dynamic KPIs based on filtered context
  const kpis = useMemo(() => {
    const totalRecommendations = filteredRecs.length;
    const avgConfidence = Math.round(
      filteredRecs.reduce((a, r) => a + r.confidence, 0) / Math.max(1, filteredRecs.length),
    );
    const portfolioRisk = Math.round(
      filteredRiskScores.reduce((a, r) => a + r.score, 0) / Math.max(1, filteredRiskScores.length),
    );
    const esgScore = Math.round(
      filteredEsgSectors.reduce((a, e) => a + e.scores.overall, 0) / Math.max(1, filteredEsgSectors.length),
    );

    return {
      totalRecommendations,
      avgConfidence,
      portfolioRisk,
      esgScore,
    };
  }, [filteredRecs, filteredRiskScores, filteredEsgSectors]);

  // Calculate recommendation pipeline status counts
  const statusCounts = useMemo(() => {
    const approved = filteredRecs.filter((r) => r.status === "approved").length;
    const underReview = filteredRecs.filter((r) => r.status === "under_review").length;
    const pendingReview = filteredRecs.filter((r) => r.status === "pending_review").length;
    const rejected = filteredRecs.filter((r) => r.status === "rejected").length;
    const total = filteredRecs.length;
    return { approved, underReview, pendingReview, rejected, total };
  }, [filteredRecs]);

  const liveFeedPreview = useMemo(() => {
    return signals.slice(0, 3);
  }, [signals]);

  // State and effect for AI Executive Summary
  const [summaryText, setSummaryText] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSummary = async () => {
      setSummaryLoading(true);
      const reg = activeRegionFilter ?? "Global";
      const sec = activeSectorFilter ?? "All Sectors";
      const queryPrompt = `Give me a concise 2-sentence investment executive summary for a portfolio filtered by region: ${reg} and sector: ${sec}. Use these exact metrics: total recommendations is ${kpis.totalRecommendations}, average confidence is ${kpis.avgConfidence}%, portfolio risk score is ${kpis.portfolioRisk}, and average ESG score is ${kpis.esgScore}%. Start directly with the summary, no intro.`;

      try {
        const res = await fetch("/api/ai-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", text: queryPrompt }],
            context: `Dashboard Executive Summary - Region: ${reg}, Sector: ${sec}`,
            portfolioSnapshot: {
              recommendations: kpis.totalRecommendations,
              approved: statusCounts.approved,
              pending: statusCounts.pendingReview,
              underReview: statusCounts.underReview,
              rejected: statusCounts.rejected,
              unreadSignals: signals.length,
            },
            model: "gemini",
            persona: "standard",
          }),
        });

        if (!active) return;
        const text = await res.text();

        if (text.includes("AI assistant is currently unavailable") || text.includes("Ollama error")) {
          setSummaryText(generateLocalSummary(activeRegionFilter, activeSectorFilter, kpis, statusCounts));
        } else {
          setSummaryText(text.trim());
        }
      } catch {
        if (!active) return;
        setSummaryText(generateLocalSummary(activeRegionFilter, activeSectorFilter, kpis, statusCounts));
      } finally {
        if (active) setSummaryLoading(false);
      }
    };

    void loadSummary();

    return () => {
      active = false;
    };
  }, [activeRegionFilter, activeSectorFilter, kpis, statusCounts, signals.length]);

  return {
    kpis,
    riskLine,
    esgSectors: filteredEsgSectors,
    topRecs,
    liveFeedPreview,
    activeRegionFilter,
    activeSectorFilter,
    setActiveRegionFilter,
    setActiveSectorFilter,
    availableRegions,
    availableSectors,
    filteredRiskScores,
    statusCounts,
    summaryText,
    summaryLoading,
  };
}
