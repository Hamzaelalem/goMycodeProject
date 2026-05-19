"use client";

import { useMemo } from "react";

import { useGlobalStore } from "@/lib/store/useGlobalStore";
import type { Signal } from "@/types";

export function useFilteredSignals(signals: Signal[]) {
  const region = useGlobalStore((s) => s.activeRegionFilter);
  const sector = useGlobalStore((s) => s.activeSectorFilter);
  const riskFactor = useGlobalStore((s) => s.activeRiskFactor);

  return useMemo(() => {
    return signals.filter((s) => {
      if (region && s.region !== region) return false;
      if (sector && s.sector !== sector) return false;
      // When a factor is active, exclude only signals that declare a different factor;
      // signals without `riskFactor` still pass region/sector so the feed does not empty.
      if (riskFactor && s.riskFactor && s.riskFactor !== riskFactor) return false;
      return true;
    });
  }, [region, riskFactor, sector, signals]);
}

