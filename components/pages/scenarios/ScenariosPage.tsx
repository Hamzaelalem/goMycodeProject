"use client";

import { ScenarioCard } from "@/components/cards/ScenarioCard";
import { ScenarioComparisonChart } from "@/components/charts/ScenarioComparisonChart";
import { IRRProjectionChart } from "@/components/charts/IRRProjectionChart";
import { ScenarioTornadoChart } from "@/components/charts/ScenarioTornadoChart";
import { ScenarioMonteCarloChart } from "@/components/charts/ScenarioMonteCarloChart";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScenariosViewModel } from "./useScenariosViewModel";

function SliderControl({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, step < 1 ? Number(n.toFixed(1)) : Math.round(n)));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs">{label}</p>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(clamp(n));
          }}
          className="h-6 w-16 rounded-md border border-input bg-transparent px-1.5 text-right text-xs tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(clamp((Array.isArray(v) ? v[0] : v) as number))}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function ScenariosPage() {
  const {
    selectedRecommendationTitle,
    portfolio,
    inputs,
    active,
    cards,
    projection,
    expectedIrrPct,
    sensitivity,
    monteCarloBands,
    setValue,
    setActive,
    savedScenarios,
    comparedKeys,
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
  } = useScenariosViewModel();

  const baseCaseIrr = cards.find((c) => c.id === "base")?.portfolioIrrPct ?? expectedIrrPct;
  const isPortfolioContext = selectedRecommendationTitle === "None selected";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Viewing context:{" "}
          <span className="font-medium text-foreground">
            {isPortfolioContext
              ? `Full portfolio · $${portfolio.totalAumB}B AUM · ${portfolio.holdings.length} holdings`
              : selectedRecommendationTitle}
          </span>
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
          <span className="text-xs text-muted-foreground">Expected IRR</span>
          <span className="text-sm font-semibold text-[#BA73FF]">{expectedIrrPct.toFixed(1)}%</span>
          <span className="text-[10px] text-muted-foreground">(probability-weighted)</span>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[35%_65%]">
        <div className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Scenario controls</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SliderControl label="Oil price ($/bbl)" unit="" value={inputs.oilPrice} min={50} max={130} step={1} onChange={(v) => setValue("oilPrice", v)} />
              <SliderControl label="FX delta (%)" unit="%" value={inputs.fxDeltaPct} min={-20} max={20} step={1} onChange={(v) => setValue("fxDeltaPct", v)} />
              <SliderControl label="Interest (%)" unit="%" value={inputs.interestRate} min={2} max={15} step={0.1} onChange={(v) => setValue("interestRate", v)} />
              <SliderControl label="Inflation (%)" unit="%" value={inputs.inflationRate} min={1} max={20} step={0.1} onChange={(v) => setValue("inflationRate", v)} />
              <div className="flex justify-end pt-1">
                <Button size="sm" variant="ghost" onClick={resetInputs}>Reset to defaults</Button>
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
                            <p className="font-medium text-foreground flex items-center gap-1.5">
                              {s.displayName}
                              <span className={`rounded px-1 py-0.5 text-[9px] font-normal ${s.scoped ? "bg-[#378ADD]/15 text-[#378ADD]" : "bg-muted text-muted-foreground"}`}>
                                {s.scoped ? "This deal" : "Global"}
                              </span>
                            </p>
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
            <CardContent><ScenarioComparisonChart cards={cards} expectedIrr={expectedIrrPct} /></CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>IRR projection (Years 1–10)</CardTitle></CardHeader>
            <CardContent>
              <IRRProjectionChart data={projection} comparedNames={comparedKeys} labelMap={comparedLabels} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sensitivity (IRR swing)</CardTitle>
            <p className="text-xs text-muted-foreground">One-at-a-time impact on base-case IRR, largest first.</p>
          </CardHeader>
          <CardContent>
            <ScenarioTornadoChart bars={sensitivity} centerline={baseCaseIrr} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monte Carlo IRR band</CardTitle>
            <p className="text-xs text-muted-foreground">P10–P90 envelope with median from 400 randomized macro draws.</p>
          </CardHeader>
          <CardContent>
            <ScenarioMonteCarloChart bands={monteCarloBands} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>AI scenario explanation</CardTitle>
              <p className="text-xs text-muted-foreground">
                Grounded in the current inputs, scenario spread, sensitivity{selectedRecommendationTitle !== "None selected" ? ", and selected deal" : ""}.
              </p>
            </div>
            <Button size="sm" onClick={handleExplain} disabled={explaining}>
              {explaining ? "Analysing…" : "Explain scenario"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {narrative ? (
            <div className="space-y-1.5">
              <p className="text-sm leading-relaxed text-foreground">{narrative}</p>
              {narrativeModel && (
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">via {narrativeModel}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click <span className="font-medium text-foreground">Explain scenario</span> to generate a concise, data-grounded narrative of the current outcomes.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((c) => <ScenarioCard key={c.id} item={c} active={active === c.id} onClick={() => setActive(c.id)} />)}
      </div>
    </div>
  );
}


