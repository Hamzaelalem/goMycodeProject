"use client";

import { useEffect, useMemo, useState } from "react";

import { ESGBarChart } from "@/components/charts/ESGBarChart";
import { ESGCompanyRow } from "@/components/cards/ESGCompanyRow";
import { KPICard } from "@/components/cards/KPICard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateEsgSectorApi } from "@/lib/api/mutations";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import type { EsgSectorInputs } from "@/types";

export default function EsgPage() {
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <KPICard label="E score" value={`${avgE}`} />
        <KPICard label="S score" value={`${avgS}`} />
        <KPICard label="G score" value={`${avgG}`} />
        <KPICard label="Overall grade" value={`${overall}`} hint={selectedSector.scores.grade} />
      </div>
      <Card>
        <CardHeader><CardTitle>ESG by sector</CardTitle></CardHeader>
        <CardContent><ESGBarChart sectors={data} onSelectSector={syncSector} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>KPI editor</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={sector} onValueChange={(v) => syncSector(v ?? sector)}>
            <SelectTrigger><SelectValue placeholder="Sector" /></SelectTrigger>
            <SelectContent>
              {data.map((d) => <SelectItem key={d.sector} value={d.sector}>{d.sector}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="grid gap-2 md:grid-cols-2">
            {selectedSector.kpis.map((k) => (
              <ESGCompanyRow key={k.id} kpi={k} onChange={(v) => updateKpi(k.id, v)} />
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

