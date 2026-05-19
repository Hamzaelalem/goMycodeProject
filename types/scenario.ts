export type ScenarioId = "base" | "bull" | "bear" | "stress";

export interface ScenarioInputs {
  oilPrice: number; // $/bbl
  fxDeltaPct: number; // -20..20
  interestRate: number; // %
  inflationRate: number; // %
}

export interface ScenarioCard {
  id: ScenarioId;
  label: string;
  probabilityPct: number;
  portfolioIrrPct: number;
  projectedAumB: number;
  riskScore: number; // 0-100
}

export interface IrrProjectionPoint {
  year: number; // 1..10
  base: number;
  bull: number;
  bear: number;
  stress: number;
}
