"use client";

import { AlertTriangle, Loader2, Radar, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AssetRebalance, RebalanceAction } from "@/lib/sentinel/rebalance";
import { usePortfolioSentinelViewModel } from "./usePortfolioSentinelViewModel";

const ACTION_STYLES: Record<RebalanceAction, string> = {
  BUY: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  SELL: "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  HOLD: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function ScoreBar({ label, value, tone }: { label: string; value: number; tone: "confidence" | "risk" }) {
  const fill =
    tone === "confidence"
      ? "bg-sky-500"
      : value >= 70
        ? "bg-rose-500"
        : value >= 45
          ? "bg-amber-500"
          : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium tabular-nums text-foreground">{value}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn("h-full rounded-full", fill)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function AssetCard({ asset, newWeight }: { asset: AssetRebalance; newWeight?: number }) {
  const { directive } = asset;
  const adjustment = directive.targetAdjustmentPct;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{asset.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {asset.sector} · {asset.region}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold", ACTION_STYLES[directive.action])}>
          {directive.action}
          {adjustment !== 0 ? ` ${adjustment > 0 ? "+" : ""}${adjustment}pp` : ""}
        </span>
      </div>

      <div className="text-xs text-muted-foreground">
        Weight <span className="font-medium tabular-nums text-foreground">{asset.currentWeightPct}%</span>
        {newWeight !== undefined ? (
          <>
            {" → "}
            <span className="font-medium tabular-nums text-foreground">{newWeight}%</span>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ScoreBar label="Confidence" value={directive.confidence} tone="confidence" />
        <ScoreBar label="Risk" value={directive.riskScore} tone="risk" />
      </div>

      <div className="rounded-lg bg-muted/60 p-2 text-xs">
        <p className="font-medium text-foreground">Key catalyst</p>
        <p className="mt-0.5 text-muted-foreground">{directive.keyCatalyst}</p>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{directive.rationale}</p>

      {directive.guardrails.length > 0 ? (
        <ul className="space-y-0.5 text-[11px] text-amber-700 dark:text-amber-300">
          {directive.guardrails.map((g) => (
            <li key={g} className="flex gap-1">
              <ShieldCheck className="mt-px h-3 w-3 shrink-0" aria-hidden />
              {g}
            </li>
          ))}
        </ul>
      ) : null}

      {asset.headlines.length > 0 ? (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            {asset.headlines.length} live headline{asset.headlines.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-1 space-y-1">
            {asset.headlines.map((h) => (
              <li key={h.link}>
                <a href={h.link} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                  {h.title}
                </a>{" "}
                <span className="text-muted-foreground">— {h.publisher}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="text-xs text-muted-foreground">No live headlines retrieved.</p>
      )}
    </div>
  );
}

export function PortfolioSentinel() {
  const {
    result,
    scanning,
    error,
    signedOff,
    setSignedOff,
    appliedWeights,
    appliedAt,
    counts,
    actionable,
    scan,
    applySimulatedRebalance,
    resetSimulation,
  } = usePortfolioSentinelViewModel();

  return (
    <section className="space-y-4 rounded-xl border border-border p-4" aria-labelledby="sentinel-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="sentinel-title" className="flex items-center gap-2 text-base font-semibold">
            <Radar className="h-4 w-4" aria-hidden /> Adaptive Portfolio Sentinel
          </h2>
          <p className="text-xs text-muted-foreground">
            Scans live Google News for every holding and proposes guarded BUY / SELL / HOLD weight changes.
          </p>
        </div>
        <Button onClick={() => void scan()} disabled={scanning}>
          {scanning ? <Loader2 className="animate-spin" aria-hidden /> : <Radar aria-hidden />}
          {scanning ? "Scanning live market…" : "Scan Live Market & Rebalance"}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      {result ? (
        <>
          {result.mode === "fallback" ? (
            <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                <strong>Deterministic fallback mode</strong> — the AI model was unavailable ({result.fallbackReason}).
                Directives come from keyword sentiment over {result.headlineCount} live headlines.
              </span>
            </div>
          ) : null}

          {result.providerNote ? (
            <p className="text-xs text-muted-foreground">
              <AlertTriangle className="mr-1 inline h-3 w-3" aria-hidden />
              {result.providerNote}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("rounded-md border px-2 py-0.5 font-semibold", ACTION_STYLES.BUY)}>{counts.BUY} BUY</span>
            <span className={cn("rounded-md border px-2 py-0.5 font-semibold", ACTION_STYLES.SELL)}>{counts.SELL} SELL</span>
            <span className={cn("rounded-md border px-2 py-0.5 font-semibold", ACTION_STYLES.HOLD)}>{counts.HOLD} HOLD</span>
            <span>
              · {result.headlineCount} headlines · {result.model} · {new Date(result.generatedAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {result.assets.map((asset) => (
              <AssetCard key={asset.holdingId} asset={asset} newWeight={appliedWeights?.[asset.holdingId]} />
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Human-in-the-Loop Sign-Off
            </p>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                role="switch"
                className="mt-0.5 h-4 w-4 accent-emerald-600"
                checked={signedOff}
                onChange={(e) => setSignedOff(e.target.checked)}
                disabled={appliedWeights !== null}
              />
              <span>
                I have reviewed the {actionable} actionable directive{actionable === 1 ? "" : "s"}, their evidence and
                guardrails, and I authorise applying them to the simulated portfolio.
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={applySimulatedRebalance} disabled={!signedOff || appliedWeights !== null || actionable === 0}>
                Apply simulated rebalance
              </Button>
              {appliedWeights ? (
                <Button variant="outline" onClick={resetSimulation}>
                  Reset simulation
                </Button>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {appliedAt
                  ? `Applied ${new Date(appliedAt).toLocaleTimeString()} — new weights on each card, renormalised to 100% (HOLD positions shift proportionally).`
                  : "Simulation only: no trades are executed and no records are changed."}
              </span>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
