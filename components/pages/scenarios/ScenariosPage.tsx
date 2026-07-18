"use client";

import { ScenarioCard } from "@/components/cards/ScenarioCard";
import { ScenarioComparisonChart } from "@/components/charts/ScenarioComparisonChart";
import { IRRProjectionChart } from "@/components/charts/IRRProjectionChart";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScenariosViewModel } from "./useScenariosViewModel";

export default function ScenariosPage() {
  const {
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
  } = useScenariosViewModel();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Viewing context: <span className="font-medium text-foreground">{selectedRecommendationTitle}</span>
      </p>
      
      <div className="grid gap-3 lg:grid-cols-[35%_65%]">
        <div className="space-y-3">
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
            <CardHeader><CardTitle>Saved Sandboxes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Save active sandbox</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. High Inflation 2026"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button size="sm" onClick={handleSaveCurrent} disabled={saving || !saveName.trim()}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
                {saveError && <p className="text-xs text-destructive">{saveError}</p>}
              </div>

              <div className="border-t border-border/60 pt-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">Compare & presets</p>
                {savedScenarios.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No saved sandboxes yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-auto pr-1">
                    {savedScenarios.map((s) => {
                      const isCompared = comparedKeys.includes(s.key);
                      return (
                        <div key={s.key} className="flex items-center justify-between rounded-lg border border-border p-2 text-xs bg-muted/30">
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{s.key}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Oil: ${s.defaultInputs.oilPrice} · FX: {s.defaultInputs.fxDeltaPct}% · IR: {s.defaultInputs.interestRate}% · Inf: {s.defaultInputs.inflationRate}%
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isCompared}
                                onChange={() => toggleCompare(s.key)}
                                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              <span>Compare</span>
                            </label>
                            <Button
                              size="xs"
                              variant="outline"
                              className="h-6"
                              onClick={() => applyPreset(s.defaultInputs)}
                            >
                              Load
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Scenario comparison</CardTitle></CardHeader>
            <CardContent><ScenarioComparisonChart cards={cards} /></CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>IRR projection (Years 1–10)</CardTitle></CardHeader>
            <CardContent>
              <IRRProjectionChart data={projection} comparedNames={comparedKeys} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((c) => <ScenarioCard key={c.id} item={c} active={active === c.id} onClick={() => setActive(c.id)} />)}
      </div>
    </div>
  );
}


