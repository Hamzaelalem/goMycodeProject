"use client";

import { useRouter } from "next/navigation";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import { useFilteredSignals } from "@/lib/hooks/useCrossModuleFilter";
import { useNavigateFromSignal } from "@/lib/hooks/useSignalNavigation";
import { getMacroInputsForSignal } from "@/lib/navigation/signalActionMapping";
import type { Signal } from "@/types";

export function useLiveFeedPanelViewModel() {
  const router = useRouter();
  const navigateFromSignal = useNavigateFromSignal();
  const signals = useGlobalStore((s) => s.signals);
  const selectedSignal = useGlobalStore((s) => s.selectedSignal);
  const setSelectedSignal = useGlobalStore((s) => s.setSelectedSignal);
  const setScenarioInputs = useGlobalStore((s) => s.setScenarioInputs);
  const openAIDrawer = useGlobalStore((s) => s.openAIDrawer);
  const setAiDrawerInitialMessage = useGlobalStore((s) => s.setAiDrawerInitialMessage);

  const filtered = useFilteredSignals(signals).slice(0, 10);

  function handleSelect(s: Signal) {
    if (selectedSignal?.id === s.id) {
      setSelectedSignal(null);
    } else {
      setSelectedSignal(s);
    }
  }

  function handleAIAssessment(s: Signal) {
    openAIDrawer(`Signal: ${s.title}`);
    setAiDrawerInitialMessage(
      `Please provide an impact assessment and potential mitigation options for this alert:\n\n` +
      `Alert: ${s.title}\n` +
      `Impact: ${s.body}\n` +
      `Sector: ${s.sector} · Region: ${s.region} · Severity: ${s.severity}`
    );
  }

  function handleStressTest(s: Signal) {
    const inputs = getMacroInputsForSignal(s);
    setScenarioInputs(inputs);
    router.push("/scenarios");
  }

  return {
    selectedSignal,
    filtered,
    navigateFromSignal,
    handleSelect,
    handleAIAssessment,
    handleStressTest,
  };
}
