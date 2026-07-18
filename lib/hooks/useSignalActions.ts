"use client";

import { useRouter } from "next/navigation";

import { useGlobalStore } from "@/lib/store/useGlobalStore";
import { useNavigateFromSignal } from "@/lib/hooks/useSignalNavigation";
import { getMacroInputsForSignal } from "@/lib/navigation/signalActionMapping";
import type { Signal } from "@/types";

/**
 * Shared signal interactions used by both the Live Feed page and the
 * right-rail Live Feed panel: select/toggle, AI impact assessment, and
 * stress-test → scenarios. Centralized here so the two view-models stay in sync.
 */
export function useSignalActions() {
  const router = useRouter();
  const navigateFromSignal = useNavigateFromSignal();
  const selectedSignal = useGlobalStore((s) => s.selectedSignal);
  const setSelectedSignal = useGlobalStore((s) => s.setSelectedSignal);
  const setScenarioInputs = useGlobalStore((s) => s.setScenarioInputs);
  const openAIDrawer = useGlobalStore((s) => s.openAIDrawer);
  const setAiDrawerInitialMessage = useGlobalStore((s) => s.setAiDrawerInitialMessage);

  function handleSelect(s: Signal) {
    setSelectedSignal(selectedSignal?.id === s.id ? null : s);
  }

  function handleAIAssessment(s: Signal) {
    openAIDrawer(`Signal: ${s.title}`);
    setAiDrawerInitialMessage(
      `Please provide an impact assessment and potential mitigation options for this alert:\n\n` +
        `Alert: ${s.title}\n` +
        `Impact: ${s.body}\n` +
        `Sector: ${s.sector} · Region: ${s.region} · Severity: ${s.severity}`,
    );
  }

  function handleStressTest(s: Signal) {
    const inputs = getMacroInputsForSignal(s);
    setScenarioInputs(inputs);
    router.push("/scenarios");
  }

  return {
    selectedSignal,
    navigateFromSignal,
    handleSelect,
    handleAIAssessment,
    handleStressTest,
  };
}
