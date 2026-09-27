import { heuristicSentiment } from "@/lib/ingest/keywords";
import type { PortfolioHolding } from "@/types";

/**
 * Adaptive Portfolio Sentinel — pure rebalancing logic (no I/O), shared by the
 * API route and the client so directives are validated and applied identically.
 */

export type RebalanceAction = "BUY" | "SELL" | "HOLD";

export const REBALANCE_ACTIONS: RebalanceAction[] = ["BUY", "SELL", "HOLD"];

/** Largest weight change (percentage points) a single directive may propose. */
export const MAX_ADJUSTMENT_PCT = 5;

/** Directives below this confidence are downgraded to HOLD (Responsible-AI guardrail). */
export const MIN_ACTIONABLE_CONFIDENCE = 55;

export interface Headline {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
}

export interface RebalanceDirective {
  action: RebalanceAction;
  /** Signed change to the holding's portfolio weight, in percentage points. */
  targetAdjustmentPct: number;
  confidence: number; // 1-100
  riskScore: number; // 1-100
  rationale: string;
  keyCatalyst: string;
  /** Guardrails that modified the raw model output, for transparency. */
  guardrails: string[];
}

export interface AssetRebalance {
  holdingId: string;
  name: string;
  sector: string;
  region: string;
  currentWeightPct: number;
  newsQuery: string;
  headlines: Headline[];
  directive: RebalanceDirective;
}

export type RebalanceMode = "live-ai" | "fallback";

export interface RebalanceResponse {
  mode: RebalanceMode;
  /** "database" = the client's saved portfolio; "demo" = DB unreachable, demo holdings used. */
  portfolioSource: "database" | "demo";
  model: string;
  generatedAt: string;
  /** Why the deterministic fallback was used (only when mode = "fallback"). */
  fallbackReason?: string;
  /** Set when a secondary live model answered because the primary one failed. */
  providerNote?: string;
  headlineCount: number;
  assets: AssetRebalance[];
  /** Saved scan id — absent only if persisting the scan failed. */
  scanId?: string;
  /** Human sign-off (set once, via POST /api/portfolio/rebalance/:id/signoff). */
  signedOffAt?: string | null;
  signedOffBy?: string | null;
  /** holdingId → simulated weight %, computed server-side at sign-off. */
  appliedWeights?: Record<string, number> | null;
}

/** Row in the scan history list. */
export interface SentinelScanSummary {
  scanId: string;
  generatedAt: string;
  mode: RebalanceMode;
  model: string;
  counts: Record<RebalanceAction, number>;
  signedOffAt: string | null;
}

export function countActions(assets: AssetRebalance[]): Record<RebalanceAction, number> {
  const counts: Record<RebalanceAction, number> = { BUY: 0, SELL: 0, HOLD: 0 };
  for (const asset of assets) counts[asset.directive.action] += 1;
  return counts;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export { summarizeProviderError } from "@/lib/llm/errors";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Google News search for a private holding: sector + region are what move its market. */
export function newsQueryFor(holding: Pick<PortfolioHolding, "sector" | "region">): string {
  return `${holding.sector} ${holding.region} market news`;
}

/** Current portfolio weight of each holding, in %, by AUM. */
export function portfolioWeights(holdings: PortfolioHolding[]): Record<string, number> {
  const total = holdings.reduce((sum, h) => sum + h.aumUsdB, 0);
  return Object.fromEntries(
    holdings.map((h) => [h.id, total > 0 ? round1((h.aumUsdB / total) * 100) : 0]),
  );
}

/**
 * Normalise one raw directive (LLM or fallback) and apply guardrails:
 * action/sign consistency, adjustment cap, low-confidence → HOLD, no news → HOLD,
 * and never selling below a 0% weight.
 */
export function applyGuardrails(
  raw: {
    action?: unknown;
    targetAdjustmentPct?: unknown;
    confidence?: unknown;
    riskScore?: unknown;
    rationale?: unknown;
    keyCatalyst?: unknown;
  },
  context: { currentWeightPct: number; headlineCount: number },
): RebalanceDirective {
  const guardrails: string[] = [];
  const rawAction = String(raw.action ?? "").toUpperCase();
  let action: RebalanceAction = REBALANCE_ACTIONS.includes(rawAction as RebalanceAction)
    ? (rawAction as RebalanceAction)
    : "HOLD";
  if (action !== rawAction) guardrails.push(`Unrecognised action "${String(raw.action)}" treated as HOLD.`);

  const confidence = Math.round(clamp(toNumber(raw.confidence, 50), 1, 100));
  const riskScore = Math.round(clamp(toNumber(raw.riskScore, 50), 1, 100));
  let adjustment = Math.abs(toNumber(raw.targetAdjustmentPct, 0));

  if (adjustment > MAX_ADJUSTMENT_PCT) {
    guardrails.push(`Adjustment capped at ±${MAX_ADJUSTMENT_PCT}pp (model proposed ${round1(adjustment)}pp).`);
    adjustment = MAX_ADJUSTMENT_PCT;
  }
  if (action !== "HOLD" && context.headlineCount === 0) {
    guardrails.push("No live headlines retrieved — downgraded to HOLD.");
    action = "HOLD";
  }
  if (action !== "HOLD" && confidence < MIN_ACTIONABLE_CONFIDENCE) {
    guardrails.push(`Confidence ${confidence} < ${MIN_ACTIONABLE_CONFIDENCE} — downgraded to HOLD.`);
    action = "HOLD";
  }
  if (action === "SELL" && adjustment > context.currentWeightPct) {
    guardrails.push(`Sell capped at the current ${context.currentWeightPct}% weight.`);
    adjustment = context.currentWeightPct;
  }
  if (action === "HOLD") adjustment = 0;

  const signed = action === "SELL" ? -adjustment : adjustment;
  return {
    action,
    targetAdjustmentPct: round1(signed) || 0,
    confidence,
    riskScore,
    rationale: String(raw.rationale ?? "").trim().slice(0, 400) || "No rationale provided.",
    keyCatalyst: String(raw.keyCatalyst ?? "").trim().slice(0, 200) || "No specific catalyst identified.",
    guardrails,
  };
}

/**
 * Deterministic directive when Gemini is unavailable: keyword sentiment over the
 * live headlines plus the holding's own risk score. Same inputs → same output.
 */
export function fallbackDirective(
  holding: PortfolioHolding,
  headlines: Headline[],
  currentWeightPct: number,
): RebalanceDirective {
  const sentiments = headlines.map((h) => heuristicSentiment(h.title));
  const avg = sentiments.length ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0;
  const strongest = headlines.reduce<{ title: string; score: number } | null>((best, h, i) => {
    const score = Math.abs(sentiments[i] ?? 0);
    return !best || score > best.score ? { title: h.title, score } : best;
  }, null);

  const riskAdjusted = avg - (holding.riskScore - 55) / 100;
  const action: RebalanceAction = riskAdjusted >= 0.25 ? "BUY" : riskAdjusted <= -0.25 ? "SELL" : "HOLD";
  const confidence = Math.round(clamp(55 + Math.abs(riskAdjusted) * 40 + headlines.length * 2, 1, 90));

  return applyGuardrails(
    {
      action,
      targetAdjustmentPct: clamp(Math.abs(riskAdjusted) * 6, 0, MAX_ADJUSTMENT_PCT),
      confidence,
      riskScore: holding.riskScore,
      rationale: `Deterministic fallback: headline sentiment ${round1(avg)} across ${headlines.length} article(s), adjusted for the holding's risk score of ${holding.riskScore}.`,
      keyCatalyst: strongest?.title ?? "No live headlines available.",
    },
    { currentWeightPct, headlineCount: headlines.length },
  );
}

/**
 * Apply directives to weights and renormalise to 100%. Purely a simulation —
 * nothing is persisted.
 */
export function simulateRebalance(assets: AssetRebalance[]): Record<string, number> {
  const raw = assets.map((a) => ({
    id: a.holdingId,
    weight: Math.max(0, a.currentWeightPct + a.directive.targetAdjustmentPct),
  }));
  const total = raw.reduce((sum, r) => sum + r.weight, 0);
  return Object.fromEntries(raw.map((r) => [r.id, total > 0 ? round1((r.weight / total) * 100) : 0]));
}
