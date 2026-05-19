"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { applySignalCrossModuleLinks, routeForSignal } from "@/lib/navigation/signalCrossModule";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import type { Signal } from "@/types";

/**
 * One entry point for signal clicks: syncs cross-module filters then routes.
 */
export function useNavigateFromSignal() {
  const router = useRouter();

  return useCallback(
    (signal: Signal) => {
      const st = useGlobalStore.getState();
      applySignalCrossModuleLinks(signal, {
        setSelectedSignal: st.setSelectedSignal,
        setActiveRegionFilter: st.setActiveRegionFilter,
        setActiveSectorFilter: st.setActiveSectorFilter,
        setActiveRiskFactor: st.setActiveRiskFactor,
        setWorkflowFocusRecommendationId: st.setWorkflowFocusRecommendationId,
      });
      router.push(routeForSignal(signal));
    },
    [router],
  );
}
