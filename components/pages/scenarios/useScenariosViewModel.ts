"use client";

import { useEffect, useMemo, useState } from "react";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { computeIrrProjection, computeScenarioCards } from "@/mock-data/scenarios.v2";

export function useScenariosViewModel() {
  const selected = useGlobalStore((s) => s.selectedRecommendation);
  const inputs = useGlobalStore((s) => s.scenarioInputs);
  const setScenarioInputs = useGlobalStore((s) => s.setScenarioInputs);
  const savedScenarios = useGlobalStore((s) => s.savedScenarios);
  const saveScenarioAction = useGlobalStore((s) => s.saveScenarioAction);
  const loadSavedScenariosAction = useGlobalStore((s) => s.loadSavedScenariosAction);

  const debounced = useDebounce(inputs, 150);
  const [active, setActive] = useState<"base" | "bull" | "bear" | "stress">("base");
  const [comparedKeys, setComparedKeys] = useState<string[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    void loadSavedScenariosAction();
  }, [loadSavedScenariosAction]);

  const cards = useMemo(() => computeScenarioCards(debounced), [debounced]);
  const baseProjection = useMemo(() => computeIrrProjection(cards), [cards]);

  const projection = useMemo(() => {
    return baseProjection.map((p) => {
      const pt = { ...p } as any;
      comparedKeys.forEach((key) => {
        const match = savedScenarios.find((x) => x.key === key);
        if (match) {
          const basePoint = match.irrProjection.find((bp) => bp.year === p.year);
          if (basePoint) {
            pt[key] = basePoint.base;
          }
        }
      });
      return pt;
    });
  }, [baseProjection, comparedKeys, savedScenarios]);

  function setValue<K extends keyof typeof inputs>(k: K, value: number) {
    setScenarioInputs({ ...inputs, [k]: value });
  }

  function toggleCompare(key: string) {
    setComparedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function applyPreset(presets: typeof inputs) {
    setScenarioInputs(presets);
  }

  async function handleSaveCurrent() {
    const trimmed = saveName.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaveError(null);
    try {
      const ok = await saveScenarioAction(trimmed, inputs, cards, baseProjection);
      if (ok) {
        setSaveName("");
      } else {
        setSaveError("Failed to save (local store fallback used)");
      }
    } catch {
      setSaveError("Network error (saved locally)");
    } finally {
      setSaving(false);
    }
  }

  const selectedRecommendationTitle = selected?.title ?? "None selected";

  return {
    selectedRecommendationTitle,
    inputs,
    active,
    cards,
    projection,
    setValue,
    setActive,
    savedScenarios,
    comparedKeys,
    toggleCompare,
    applyPreset,
    saveName,
    setSaveName,
    saving,
    saveError,
    handleSaveCurrent,
  };
}
