"use client";

import { useEffect, useMemo, useState } from "react";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { computeScenariosApi, explainScenarioApi } from "@/lib/api/mutations";
import { mockPortfolio } from "@/mock-data/portfolio";
import type { IrrProjectionPoint } from "@/types";
import {
  baseFromPortfolio,
  baseFromRecommendation,
  computeScenarioBundle,
  type ScenarioBundle,
} from "@/lib/scenarios/compute";

type ComparedProjectionPoint = IrrProjectionPoint & Record<string, number>;

const SCOPE_SEP = "::";

function parseScenarioKey(key: string): { recId: string | null; name: string } {
  const idx = key.indexOf(SCOPE_SEP);
  if (idx === -1) return { recId: null, name: key };
  return { recId: key.slice(0, idx), name: key.slice(idx + SCOPE_SEP.length) };
}

export function useScenariosViewModel() {
  const selected = useGlobalStore((s) => s.selectedRecommendation);
  const inputs = useGlobalStore((s) => s.scenarioInputs);
  const setScenarioInputs = useGlobalStore((s) => s.setScenarioInputs);
  const resetScenarioInputs = useGlobalStore((s) => s.resetScenarioInputs);
  const savedScenarios = useGlobalStore((s) => s.savedScenarios);
  const saveScenarioAction = useGlobalStore((s) => s.saveScenarioAction);
  const loadSavedScenariosAction = useGlobalStore((s) => s.loadSavedScenariosAction);

  const debounced = useDebounce(inputs, 150);
  const [active, setActive] = useState<"base" | "bull" | "bear" | "stress">("base");
  const [comparedKeys, setComparedKeys] = useState<string[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeModel, setNarrativeModel] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [serverBundle, setServerBundle] = useState<{ key: string; bundle: ScenarioBundle } | null>(
    null,
  );

  useEffect(() => {
    void loadSavedScenariosAction();
  }, [loadSavedScenariosAction]);

  // Portfolio-level base case (AUM-weighted). A selected recommendation overrides IRR/risk
  // for deal-in-context modelling while keeping the portfolio's AUM anchor.
  const portfolioBase = useMemo(() => baseFromPortfolio(mockPortfolio), []);
  const base = useMemo(
    () => baseFromRecommendation(selected, portfolioBase),
    [selected, portfolioBase],
  );

  // Instant client-side computation for responsive slider feedback / offline fallback.
  const clientBundle = useMemo(() => computeScenarioBundle(debounced, base), [debounced, base]);

  // Authoritative server-side computation (the "real computation backend"). Keyed by the
  // inputs + selected deal so we only trust the server result once it matches current state.
  const computeKey = useMemo(
    () => JSON.stringify([debounced, selected?.id ?? null]),
    [debounced, selected?.id],
  );

  useEffect(() => {
    const controller = new AbortController();
    computeScenariosApi(debounced, selected?.id, controller.signal).then((result) => {
      if (result) setServerBundle({ key: computeKey, bundle: result });
    });
    return () => controller.abort();
  }, [computeKey, debounced, selected?.id]);

  // Prefer the server bundle only when it corresponds to the current inputs; otherwise the
  // instant client bundle keeps the UI responsive (no stale values, no flicker).
  const bundle = serverBundle?.key === computeKey ? serverBundle.bundle : clientBundle;
  const { cards, projection: baseProjection, expectedIrr: expectedIrrPct, sensitivity, monteCarlo: monteCarloBands } = bundle;

  // Saved sandboxes are scoped: global ones (no scope prefix) plus those tagged to the
  // recommendation currently in context. Keys are stored as `${recId}::${name}`.
  const visibleSavedScenarios = useMemo(() => {
    return savedScenarios
      .map((s) => {
        const { recId, name } = parseScenarioKey(s.key);
        return { ...s, displayName: name, scoped: recId !== null, recId };
      })
      .filter((s) => s.recId === null || s.recId === selected?.id);
  }, [savedScenarios, selected?.id]);

  const visibleKeys = useMemo(
    () => new Set(visibleSavedScenarios.map((s) => s.key)),
    [visibleSavedScenarios],
  );
  const activeComparedKeys = useMemo(
    () => comparedKeys.filter((k) => visibleKeys.has(k)),
    [comparedKeys, visibleKeys],
  );
  const comparedLabels = useMemo(
    () =>
      Object.fromEntries(
        activeComparedKeys.map((k) => [k, parseScenarioKey(k).name]),
      ) as Record<string, string>,
    [activeComparedKeys],
  );

  const projection = useMemo<ComparedProjectionPoint[]>(() => {
    return baseProjection.map((p) => {
      const pt: ComparedProjectionPoint = { ...p };
      activeComparedKeys.forEach((key) => {
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
  }, [baseProjection, activeComparedKeys, savedScenarios]);

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

  function resetInputs() {
    resetScenarioInputs();
  }

  async function handleSaveCurrent() {
    const trimmed = saveName.trim();
    if (!trimmed) return;
    const key = selected ? `${selected.id}${SCOPE_SEP}${trimmed}` : trimmed;
    setSaving(true);
    setSaveError(null);
    try {
      const ok = await saveScenarioAction(key, inputs, cards, baseProjection);
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

  async function handleExplain() {
    setExplaining(true);
    try {
      const result = await explainScenarioApi({
        inputs,
        cards,
        expectedIrr: expectedIrrPct,
        sensitivity,
        recommendation: selected
          ? {
              title: selected.title,
              region: selected.region,
              sector: selected.sector,
              irrPct: selected.irrPct,
              riskLevel: selected.riskLevel,
            }
          : null,
      });
      if (result) {
        setNarrative(result.narrative);
        setNarrativeModel(result.model);
      } else {
        setNarrative("Could not generate an explanation right now. Please try again.");
        setNarrativeModel(null);
      }
    } finally {
      setExplaining(false);
    }
  }

  const selectedRecommendationTitle = selected?.title ?? "None selected";

  return {
    selectedRecommendationTitle,
    portfolio: mockPortfolio,
    inputs,
    active,
    cards,
    projection,
    expectedIrrPct,
    sensitivity,
    monteCarloBands,
    setValue,
    setActive,
    savedScenarios: visibleSavedScenarios,
    comparedKeys: activeComparedKeys,
    comparedLabels,
    toggleCompare,
    applyPreset,
    resetInputs,
    saveName,
    setSaveName,
    saving,
    saveError,
    handleSaveCurrent,
    narrative,
    narrativeModel,
    explaining,
    handleExplain,
  };
}
