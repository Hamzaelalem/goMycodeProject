"use client";

import { useMemo, useState } from "react";

import { ScenarioCard } from "@/components/cards/ScenarioCard";
import { ScenarioComparisonChart } from "@/components/charts/ScenarioComparisonChart";
import { IRRProjectionChart } from "@/components/charts/IRRProjectionChart";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { computeIrrProjection, computeScenarioCards, DEFAULT_INPUTS } from "@/mock-data/scenarios.v2";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

export default function ScenariosPage() {
  const selected = useGlobalStore((s) => s.selectedRecommendation);
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const debounced = useDebounce(inputs, 150);
  const [active, setActive] = useState<"base" | "bull" | "bear" | "stress">("base");
  const cards = useMemo(() => computeScenarioCards(debounced), [debounced]);
  const projection = useMemo(() => computeIrrProjection(cards), [cards]);

  function setValue<K extends keyof typeof inputs>(k: K, value: number) {
    setInputs((s) => ({ ...s, [k]: value }));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Viewing context: <span className="font-medium text-foreground">{selected?.title ?? "None selected"}</span>
      </p>
      <div className="grid gap-3 lg:grid-cols-[40%_60%]">
        <Card>
          <CardHeader><CardTitle>Scenario controls</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs">Oil price: ${inputs.oilPrice}/bbl</p>
              <Slider value={[inputs.oilPrice]} min={50} max={130} step={1} onValueChange={(v) => setValue("oilPrice", (Array.isArray(v) ? v[0] : v) as number)} />
            </div>
            <div>
              <p className="text-xs">FX delta: {inputs.fxDeltaPct}%</p>
              <Slider value={[inputs.fxDeltaPct]} min={-20} max={20} step={1} onValueChange={(v) => setValue("fxDeltaPct", (Array.isArray(v) ? v[0] : v) as number)} />
            </div>
            <div>
              <p className="text-xs">Interest: {inputs.interestRate}%</p>
              <Slider value={[inputs.interestRate]} min={2} max={15} step={0.1} onValueChange={(v) => setValue("interestRate", Number(((Array.isArray(v) ? v[0] : v) as number).toFixed(1)))} />
            </div>
            <div>
              <p className="text-xs">Inflation: {inputs.inflationRate}%</p>
              <Slider value={[inputs.inflationRate]} min={1} max={20} step={0.1} onValueChange={(v) => setValue("inflationRate", Number(((Array.isArray(v) ? v[0] : v) as number).toFixed(1)))} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Scenario comparison</CardTitle></CardHeader>
          <CardContent><ScenarioComparisonChart cards={cards} /></CardContent>
        </Card>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((c) => <ScenarioCard key={c.id} item={c} active={active === c.id} onClick={() => setActive(c.id)} />)}
      </div>
      <Card>
        <CardHeader><CardTitle>IRR projection (Years 1–10)</CardTitle></CardHeader>
        <CardContent><IRRProjectionChart data={projection} /></CardContent>
      </Card>
    </div>
  );
}

