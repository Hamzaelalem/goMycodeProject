import type {
  IrrProjectionPoint,
  PortfolioSummary,
  Recommendation,
  RiskLevel,
  ScenarioCard,
  ScenarioId,
  ScenarioInputs,
} from "@/types";

export const DEFAULT_INPUTS: ScenarioInputs = {
  oilPrice: 97,
  usdLocalRate: 95,
  interestRate: 6,
  inflationRate: 8,
};

/** Portfolio-level anchor values the scenario deltas are applied on top of. */
export interface ScenarioBase {
  baseIrr: number;
  baseAumB: number;
  baseRisk: number;
}

export const DEFAULT_BASE: ScenarioBase = {
  baseIrr: 14.6,
  baseAumB: 6.2,
  baseRisk: 61,
};

const RISK_LEVEL_SCORE: Record<RiskLevel, number> = {
  low: 42,
  medium: 61,
  high: 78,
};

/**
 * Derive the scenario anchor from the whole portfolio (AUM-weighted IRR/risk + total AUM).
 * This is the portfolio-level base case the Scenario Modelling Engine works from.
 */
export function baseFromPortfolio(portfolio: PortfolioSummary): ScenarioBase {
  return {
    baseIrr: portfolio.weightedIrrPct,
    baseAumB: portfolio.totalAumB,
    baseRisk: portfolio.weightedRiskScore,
  };
}

/**
 * Derive the scenario anchor from the recommendation currently in context so the
 * projections reflect the selected deal instead of fixed constants. AUM comes from the
 * fallback (portfolio) base because a single deal's capital is not the portfolio AUM.
 */
export function baseFromRecommendation(
  rec?: Pick<Recommendation, "irrPct" | "riskLevel"> | null,
  fallback: ScenarioBase = DEFAULT_BASE
): ScenarioBase {
  if (!rec) return fallback;
  return {
    baseIrr: Number.isFinite(rec.irrPct) ? rec.irrPct : fallback.baseIrr,
    baseAumB: fallback.baseAumB,
    baseRisk: RISK_LEVEL_SCORE[rec.riskLevel] ?? fallback.baseRisk,
  };
}

export function deltaFromOil(price: number): number {
  // Higher oil tends to improve O&G and hurt consumers; use a mild portfolio proxy
  return (price - 97) * 0.015;
}

export function deltaFromFX(rate: number): number {
  // USD/local FX index: >100 = stronger USD hurts EM; <100 = weaker USD supportive
  return -(rate - 100) * 0.08;
}

export function deltaFromIR(rate: number): number {
  // Higher rates lower valuations / raise funding costs
  return -(rate - 6) * 0.22;
}

export function deltaFromInflation(rate: number): number {
  return -(rate - 8) * 0.12;
}

export function computeScenarioCards(
  inputs: ScenarioInputs,
  base: ScenarioBase = DEFAULT_BASE
): ScenarioCard[] {
  const { baseIrr, baseAumB, baseRisk } = base;

  const macroDelta =
    deltaFromOil(inputs.oilPrice) +
    deltaFromFX(inputs.usdLocalRate) +
    deltaFromIR(inputs.interestRate) +
    deltaFromInflation(inputs.inflationRate);

  const mk = (id: ScenarioId, label: string, prob: number, irrBump: number, riskBump: number, aumBump: number) => ({
    id,
    label,
    probabilityPct: prob,
    portfolioIrrPct: Math.round((baseIrr + macroDelta + irrBump) * 10) / 10,
    projectedAumB: Math.round((baseAumB + aumBump + macroDelta * 0.06) * 10) / 10,
    riskScore: Math.max(0, Math.min(100, Math.round(baseRisk - macroDelta * 2.2 + riskBump))),
  });

  return [
    mk("base", "Base case", 55, 0, 0, 0),
    mk("bull", "Bull case", 20, 1.6, -6, 0.4),
    mk("bear", "Bear case", 18, -1.8, 7, -0.3),
    mk("stress", "Stress test", 7, -3.4, 14, -0.8),
  ];
}

/** Probability-weighted portfolio IRR across the scenario set. */
export function expectedIrr(cards: ScenarioCard[]): number {
  const totalProb = cards.reduce((sum, c) => sum + c.probabilityPct, 0);
  if (totalProb <= 0) return 0;
  const weighted = cards.reduce((sum, c) => sum + c.portfolioIrrPct * c.probabilityPct, 0);
  return Math.round((weighted / totalProb) * 10) / 10;
}

export function computeIrrProjection(cards: ScenarioCard[]): IrrProjectionPoint[] {
  const get = (id: ScenarioId) => cards.find((c) => c.id === id)?.portfolioIrrPct ?? 12;
  const base = get("base");
  const bull = get("bull");
  const bear = get("bear");
  const stress = get("stress");

  const years = Array.from({ length: 10 }, (_, i) => i + 1);
  return years.map((year) => {
    const drift = (year - 1) * 0.08;
    return {
      year,
      base: Math.round((base - drift) * 10) / 10,
      bull: Math.round((bull - drift * 0.9) * 10) / 10,
      bear: Math.round((bear - drift * 1.05) * 10) / 10,
      stress: Math.round((stress - drift * 1.1) * 10) / 10,
    };
  });
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Base-case portfolio IRR for a given set of inputs. */
function baseCaseIrr(inputs: ScenarioInputs, base: ScenarioBase): number {
  const cards = computeScenarioCards(inputs, base);
  return cards.find((c) => c.id === "base")?.portfolioIrrPct ?? base.baseIrr;
}

export interface SensitivityBar {
  key: keyof ScenarioInputs;
  label: string;
  low: number; // base-case IRR at the low end of the range
  high: number; // base-case IRR at the high end of the range
  swing: number; // high - low (signed)
}

/** ± perturbation applied to each input for one-at-a-time sensitivity. */
const SENSITIVITY_RANGES: Record<keyof ScenarioInputs, { label: string; delta: number }> = {
  oilPrice: { label: "Oil price ±$20", delta: 20 },
  usdLocalRate: { label: "USD/local FX ±10", delta: 10 },
  interestRate: { label: "Interest ±3pp", delta: 3 },
  inflationRate: { label: "Inflation ±4pp", delta: 4 },
};

/**
 * One-at-a-time sensitivity: perturb each input ±range while holding the rest, then
 * rank by absolute swing in base-case IRR (tornado ordering, largest first).
 */
export function computeSensitivity(
  inputs: ScenarioInputs,
  base: ScenarioBase = DEFAULT_BASE
): SensitivityBar[] {
  const keys = Object.keys(SENSITIVITY_RANGES) as (keyof ScenarioInputs)[];
  return keys
    .map((key) => {
      const { label, delta } = SENSITIVITY_RANGES[key];
      const low = baseCaseIrr({ ...inputs, [key]: inputs[key] - delta }, base);
      const high = baseCaseIrr({ ...inputs, [key]: inputs[key] + delta }, base);
      return { key, label, low: round1(low), high: round1(high), swing: round1(high - low) };
    })
    .sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing));
}

export interface McBandPoint {
  year: number;
  p10: number;
  p50: number;
  p90: number;
}

/** Standard deviation of each macro input for the Monte Carlo draw. */
const MC_STD: Record<keyof ScenarioInputs, number> = {
  oilPrice: 12,
  usdLocalRate: 6,
  interestRate: 1.5,
  inflationRate: 2.5,
};

/** Deterministic PRNG (mulberry32) so the band is stable across renders for the same inputs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller standard normal from a uniform generator. */
function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[idx];
}

/**
 * Monte Carlo P10/P50/P90 envelope of the base-case IRR projection: draws inputs from
 * normal distributions around the current inputs and aggregates per projection year.
 */
export function computeMonteCarloBands(
  inputs: ScenarioInputs,
  base: ScenarioBase = DEFAULT_BASE,
  draws = 400
): McBandPoint[] {
  const rng = mulberry32(0x9e3779b9);
  const years = 10;
  const perYear: number[][] = Array.from({ length: years }, () => []);

  for (let d = 0; d < draws; d++) {
    const sampled: ScenarioInputs = {
      oilPrice: inputs.oilPrice + gaussian(rng) * MC_STD.oilPrice,
      usdLocalRate: inputs.usdLocalRate + gaussian(rng) * MC_STD.usdLocalRate,
      interestRate: inputs.interestRate + gaussian(rng) * MC_STD.interestRate,
      inflationRate: inputs.inflationRate + gaussian(rng) * MC_STD.inflationRate,
    };
    const projection = computeIrrProjection(computeScenarioCards(sampled, base));
    projection.forEach((p, i) => perYear[i].push(p.base));
  }

  return perYear.map((vals, i) => {
    vals.sort((a, b) => a - b);
    return {
      year: i + 1,
      p10: round1(percentile(vals, 0.1)),
      p50: round1(percentile(vals, 0.5)),
      p90: round1(percentile(vals, 0.9)),
    };
  });
}

export interface ScenarioBundle {
  base: ScenarioBase;
  cards: ScenarioCard[];
  projection: IrrProjectionPoint[];
  expectedIrr: number;
  sensitivity: SensitivityBar[];
  monteCarlo: McBandPoint[];
}

/** Full scenario computation for a given set of inputs + anchor. Used by the API and client. */
export function computeScenarioBundle(inputs: ScenarioInputs, base: ScenarioBase): ScenarioBundle {
  const cards = computeScenarioCards(inputs, base);
  return {
    base,
    cards,
    projection: computeIrrProjection(cards),
    expectedIrr: expectedIrr(cards),
    sensitivity: computeSensitivity(inputs, base),
    monteCarlo: computeMonteCarloBands(inputs, base),
  };
}
