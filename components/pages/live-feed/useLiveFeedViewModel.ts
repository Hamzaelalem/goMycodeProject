"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import { useFilteredSignals } from "@/lib/hooks/useCrossModuleFilter";
import { useNavigateFromSignal } from "@/lib/hooks/useSignalNavigation";
import { getMacroInputsForSignal } from "@/lib/navigation/signalActionMapping";
import type { Signal } from "@/types";

export function useLiveFeedViewModel() {
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const navigateFromSignal = useNavigateFromSignal();
  const signals = useGlobalStore((s) => s.signals);
  const selectedSignal = useGlobalStore((s) => s.selectedSignal);
  const setSelectedSignal = useGlobalStore((s) => s.setSelectedSignal);
  const setScenarioInputs = useGlobalStore((s) => s.setScenarioInputs);
  const openAIDrawer = useGlobalStore((s) => s.openAIDrawer);
  const setAiDrawerInitialMessage = useGlobalStore((s) => s.setAiDrawerInitialMessage);
  const linked = useFilteredSignals(signals);

  const [type, setType] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [region, setRegion] = useState("all");
  const [sector, setSector] = useState("all");

  const filtered = useMemo(
    () =>
      linked.filter((s) => {
        if (type !== "all" && s.type !== type) return false;
        if (severity !== "all" && s.severity !== severity) return false;
        if (region !== "all" && s.region !== region) return false;
        if (sector !== "all" && s.sector !== sector) return false;
        return true;
      }),
    [linked, region, sector, severity, type],
  );

  const rows = useMemo(() => filtered, [filtered]);

  const bySource = useMemo(
    () => ({
      bloomberg: filtered.filter((s) => s.source === "bloomberg").length,
      talkwalker: filtered.filter((s) => s.source === "talkwalker").length,
      internal: filtered.filter((s) => s.source === "internal").length,
    }),
    [filtered],
  );

  const regions = useMemo(() => Array.from(new Set(signals.map((s) => s.region))), [signals]);
  const sectors = useMemo(() => Array.from(new Set(signals.map((s) => s.sector))), [signals]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.id === selectedSignal?.id ? 240 : 112),
    overscan: 8,
  });

  // Re-measure when selection changes to adjust offsets dynamically
  useEffect(() => {
    virtualizer.measure();
  }, [selectedSignal?.id, virtualizer]);

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

  function resetFilters() {
    setType("all");
    setSeverity("all");
    setRegion("all");
    setSector("all");
  }

  return {
    parentRef,
    selectedSignal,
    rows,
    bySource,
    regions,
    sectors,
    type,
    setType,
    severity,
    setSeverity,
    region,
    setRegion,
    sector,
    setSector,
    resetFilters,
    navigateFromSignal,
    virtualizer,
    handleSelect,
    handleAIAssessment,
    handleStressTest,
  };
}
