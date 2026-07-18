"use client";

import { useMemo, useState } from "react";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import { generateRecommendationApi } from "@/lib/api/mutations";

export function useRecommendationsViewModel() {
  const recs = useGlobalStore((s) => s.recommendations);
  const activeRegionFilter = useGlobalStore((s) => s.activeRegionFilter);
  const activeSectorFilter = useGlobalStore((s) => s.activeSectorFilter);
  const setActiveRegionFilter = useGlobalStore((s) => s.setActiveRegionFilter);
  const setActiveSectorFilter = useGlobalStore((s) => s.setActiveSectorFilter);
  const bootstrapData = useGlobalStore((s) => s.bootstrapData);

  const region = activeRegionFilter ?? "all";
  const sector = activeSectorFilter ?? "all";
  const [risk, setRisk] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [confidence, setConfidence] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const sectors = useMemo(() => Array.from(new Set(recs.map((r) => r.sector))), [recs]);
  const regions = useMemo(() => Array.from(new Set(recs.map((r) => r.region))), [recs]);

  const filtered = useMemo(
    () =>
      recs.filter((r) => {
        if (region !== "all" && r.region !== region) return false;
        if (sector !== "all" && r.sector !== sector) return false;
        if (risk !== "all" && r.riskLevel !== risk) return false;
        if (status !== "all" && r.status !== status) return false;
        if (r.confidence < confidence) return false;
        return true;
      }),
    [confidence, recs, region, risk, sector, status],
  );

  async function handleGenerateRecommendation() {
    setGenerationError(null);
    setGenerating(true);
    const result = await generateRecommendationApi({
      focusSector: sector !== "all" ? sector : undefined,
      focusRegion: region !== "all" ? region : undefined,
      riskAppetite: risk !== "all" ? (risk as "low" | "medium" | "high") : undefined,
      horizonYears: 6,
    });
    if (!result.success) {
      setGenerationError(result.error ?? "Generation failed");
      setGenerating(false);
      return;
    }
    setRisk("all");
    setStatus("all");
    setConfidence(0);
    if (result.data) {
      useGlobalStore.getState().addRecommendation(result.data);
      setActiveRegionFilter(result.data.region);
      setActiveSectorFilter(result.data.sector);
    }
    await bootstrapData();
    setGenerating(false);
  }

  function resetFilters() {
    setActiveRegionFilter(null);
    setActiveSectorFilter(null);
    setRisk("all");
    setStatus("all");
    setConfidence(60);
  }

  return {
    recs,
    filtered,
    region,
    sector,
    risk,
    status,
    confidence,
    generating,
    generationError,
    sectors,
    regions,
    setRegion: (v: string | null) => setActiveRegionFilter(v && v !== "all" ? v : null),
    setSector: (v: string | null) => setActiveSectorFilter(v && v !== "all" ? v : null),
    setRisk,
    setStatus,
    setConfidence,
    handleGenerateRecommendation,
    resetFilters,
  };
}
