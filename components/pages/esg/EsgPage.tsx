"use client";

import { ESGBarChart } from "@/components/charts/ESGBarChart";
import { ESGCompanyRow } from "@/components/cards/ESGCompanyRow";
import { KPICard } from "@/components/cards/KPICard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEsgViewModel } from "./useEsgViewModel";

export default function EsgPage() {
  const {
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
  } = useEsgViewModel();

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


