import type { IrrProjectionPoint, ScenarioCard, ScenarioInputs, ScenarioId } from "@/types";

export const DEFAULT_INPUTS: ScenarioInputs = {
  oilPrice: 97,
  fxDeltaPct: -5,
  interestRate: 6,
  inflationRate: 8,
};

export function deltaFromOil(price: number): number {
  // Higher oil tends to improve O&G and hurt consumers; use a mild portfolio proxy
  return (price - 97) * 0.015;
}

export function deltaFromFX(pct: number): number {
  // USD strength hurts EM; negative delta is supportive
  return -pct * 0.08;
}

export function deltaFromIR(rate: number): number {
  // Higher rates lower valuations / raise funding costs
  return -(rate - 6) * 0.22;
}

export function deltaFromInflation(rate: number): number {
  return -(rate - 8) * 0.12;
}

export function computeScenarioCards(inputs: ScenarioInputs): ScenarioCard[] {
  const baseIrr = 14.6;
  const baseAumB = 6.2;
  const baseRisk = 61;

  const macroDelta =
    deltaFromOil(inputs.oilPrice) +
    deltaFromFX(inputs.fxDeltaPct) +
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
