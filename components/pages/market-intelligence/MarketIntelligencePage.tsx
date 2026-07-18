"use client";

import { ScenarioCard } from "@/components/cards/ScenarioCard";
import { ScenarioComparisonChart } from "@/components/charts/ScenarioComparisonChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderControl } from "@/components/ui/slider-control";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatPct } from "@/lib/utils/formatters";
import { useMarketIntelligenceViewModel } from "./useMarketIntelligenceViewModel";

function ImpactStat({
  label,
  value,
  delta,
  goodWhenUp = true,
}: {
  label: string;
  value: string;
  delta: number;
  goodWhenUp?: boolean;
}) {
  const neutral = delta === 0;
  const positive = delta > 0;
  const good = neutral ? false : positive === goodWhenUp;
  const sign = positive ? "+" : "";
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className={cn("text-xs font-medium", neutral ? "text-muted-foreground" : good ? "text-emerald-600" : "text-destructive")}>
        {neutral ? "no change" : `${sign}${delta} vs baseline`}
      </p>
    </div>
  );
}

export default function MarketIntelligencePage() {
  const {
    portfolio,
    inputs,
    setValue,
    resetInputs,
    cards,
    expectedIrrPct,
    baseCard,
    impact,
    source,
  } = useMarketIntelligenceViewModel();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Portfolio Impact Simulator ·{" "}
          <span className="font-medium text-foreground">
            ${portfolio.totalAumB}B AUM · {portfolio.holdings.length} holdings
          </span>
        </p>
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-medium",
            source === "server" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground",
          )}
        >
          {source === "server" ? "computed by backend" : "instant preview…"}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[40%_60%]">
        <Card>
          <CardHeader><CardTitle>Macro assumptions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <SliderControl label="Oil price ($/bbl)" unit="" value={inputs.oilPrice} min={50} max={130} step={1} onChange={(v) => setValue("oilPrice", v)} />
            <SliderControl label="USD/local FX rate" unit="" value={inputs.usdLocalRate} min={80} max={120} step={1} onChange={(v) => setValue("usdLocalRate", v)} />
            <SliderControl label="Interest rate (%)" unit="%" value={inputs.interestRate} min={2} max={15} step={0.1} onChange={(v) => setValue("interestRate", v)} />
            <SliderControl label="Inflation (%)" unit="%" value={inputs.inflationRate} min={1} max={20} step={0.1} onChange={(v) => setValue("inflationRate", v)} />
            <div className="flex justify-end pt-1">
              <Button size="sm" variant="ghost" onClick={resetInputs}>Reset assumptions</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Portfolio impact</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ImpactStat label="Base-case IRR" value={formatPct(baseCard?.portfolioIrrPct ?? 0, 1)} delta={impact.irrDelta} />
              <ImpactStat label="Expected IRR" value={formatPct(expectedIrrPct, 1)} delta={impact.expectedDelta} />
              <ImpactStat label="Projected AUM" value={`$${(baseCard?.projectedAumB ?? 0).toFixed(1)}B`} delta={impact.aumDelta} />
              <ImpactStat label="Composite risk" value={`${baseCard?.riskScore ?? 0}`} delta={impact.riskDelta} goodWhenUp={false} />
            </div>
            <ScenarioComparisonChart cards={cards} expectedIrr={expectedIrrPct} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((c) => <ScenarioCard key={c.id} item={c} active={c.id === "base"} onClick={() => {}} />)}
      </div>

      <Card>
        <CardHeader><CardTitle>Portfolio holdings</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Holding</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">AUM</TableHead>
                <TableHead className="text-right">IRR</TableHead>
                <TableHead className="text-right">Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolio.holdings.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell className="text-muted-foreground">{h.sector}</TableCell>
                  <TableCell className="text-muted-foreground">{h.region}</TableCell>
                  <TableCell className="text-right tabular-nums">${h.aumUsdB.toFixed(1)}B</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPct(h.irrPct, 1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{h.riskScore}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold">
                <TableCell>Portfolio</TableCell>
                <TableCell className="text-muted-foreground">{portfolio.holdings.length} holdings</TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">${portfolio.totalAumB.toFixed(1)}B</TableCell>
                <TableCell className="text-right tabular-nums">{formatPct(portfolio.weightedIrrPct, 1)}</TableCell>
                <TableCell className="text-right tabular-nums">{portfolio.weightedRiskScore}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
