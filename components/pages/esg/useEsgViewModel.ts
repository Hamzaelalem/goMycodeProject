"use client";

import { useEffect, useMemo, useState } from "react";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import { updateEsgSectorApi } from "@/lib/api/mutations";
import type { EsgSectorInputs } from "@/types";

export function useEsgViewModel() {
  const selected = useGlobalStore((s) => s.selectedRecommendation);
  const esgSectors = useGlobalStore((s) => s.esgSectors);
  const mergeEsgSector = useGlobalStore((s) => s.mergeEsgSector);
  const activeSectorFilter = useGlobalStore((s) => s.activeSectorFilter);
  const setActiveSectorFilter = useGlobalStore((s) => s.setActiveSectorFilter);

  const [data, setData] = useState<EsgSectorInputs[]>(() => useGlobalStore.getState().esgSectors);
  const [sector, setSector] = useState<string>(
    selected?.sector ?? useGlobalStore.getState().esgSectors[0]?.sector ?? "Solar",
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setData(esgSectors);
  }, [esgSectors]);

  useEffect(() => {
    if (!activeSectorFilter) return;
    if (data.some((d) => d.sector === activeSectorFilter)) {
      setSector(activeSectorFilter);
    }
  }, [activeSectorFilter, data]);

  function syncSector(next: string) {
    setSector(next);
    setActiveSectorFilter(next);
  }

  const selectedSector = useMemo(
    () => data.find((d) => d.sector === sector) ?? data[0],
    [data, sector],
  );

  const overall = useMemo(
    () => Math.round(data.reduce((a, d) => a + d.scores.overall, 0) / Math.max(1, data.length)),
    [data],
  );

  const avgE = useMemo(() => Math.round(data.reduce((a, d) => a + d.scores.E, 0) / data.length), [data]);
  const avgS = useMemo(() => Math.round(data.reduce((a, d) => a + d.scores.S, 0) / data.length), [data]);
  const avgG = useMemo(() => Math.round(data.reduce((a, d) => a + d.scores.G, 0) / data.length), [data]);

  function updateKpi(id: string, value: number) {
    setData((prev) =>
      prev.map((s) => {
        if (s.sector !== selectedSector.sector) return s;
        const kpis = s.kpis.map((k) => (k.id === id ? { ...k, value } : k));
        const avg = Math.round(kpis.reduce((a, k) => a + Number(k.value), 0) / Math.max(1, kpis.length));
        const overallScore = Math.round((s.scores.E + s.scores.S + s.scores.G + avg / 2) / 3.5);
        const grade = overallScore >= 85 ? "A" : overallScore >= 75 ? "A-" : overallScore >= 65 ? "B+" : overallScore >= 55 ? "B" : "C";
        return {
          ...s,
          kpis,
          scores: { ...s.scores, overall: overallScore, grade },
        };
      }),
    );
  }

  async function handleSave() {
    setSaveError(null);
    const row = data.find((d) => d.sector === sector);
    if (!row) return;
    setSaving(true);
    try {
      const result = await updateEsgSectorApi(row.sector, {
        kpis: row.kpis,
        scores: row.scores,
      });
      if (!result.success || !result.data) {
        setSaveError(result.error ?? "Save failed");
        return;
      }
      mergeEsgSector(result.data);
      setData((prev) => prev.map((s) => (s.sector === result.data!.sector ? result.data! : s)));
    } finally {
      setSaving(false);
    }
  }

  return {
    data,
    sector,
    saveError,
    saving,
    selectedSector,
    overall,
    avgE,
    avgS,
    avgG,
    syncSector,
    updateKpi,
    handleSave,
  };
}
