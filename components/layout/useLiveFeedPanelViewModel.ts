"use client";

import { useGlobalStore } from "@/lib/store/useGlobalStore";
import { useFilteredSignals } from "@/lib/hooks/useCrossModuleFilter";
import { useSignalActions } from "@/lib/hooks/useSignalActions";

export function useLiveFeedPanelViewModel() {
  const signals = useGlobalStore((s) => s.signals);
  const { selectedSignal, navigateFromSignal, handleSelect, handleAIAssessment, handleStressTest } =
    useSignalActions();

  const filtered = useFilteredSignals(signals).slice(0, 10);

  return {
    selectedSignal,
    filtered,
    navigateFromSignal,
    handleSelect,
    handleAIAssessment,
    handleStressTest,
  };
}
