import type { RiskLevel } from "@/types";

/**
 * Brief §4.1 Step 5: if the LLM's confidence deviates from the independent
 * risk-adjusted estimate by more than this many points, flag the recommendation
 * for human review rather than surfacing it as a normal high-confidence result.
 */
export const CONFIDENCE_REVIEW_THRESHOLD = 15;

/** Baseline used when the portfolio has no recommendations to anchor on. */
export const DEFAULT_BASELINE_CONFIDENCE = 70;

export type RiskScoreLike = {
  name: string;
  score: number;
};

export type ConfidenceInputs = {
  llmConfidence: number;
  riskLevel: RiskLevel;
  riskFactors: string[];
  riskScores: RiskScoreLike[];
  /** Overall ESG score for the recommendation's sector, when known. */
  sectorEsgScore: number | null;
  /** Confidence values of existing portfolio recommendations. */
  portfolioConfidences: number[];
};

export type ConfidenceAssessment = {
  /** Stored confidence: the LLM's value adjusted by the risk engine. */
  confidence: number;
  /** Estimate built only from portfolio + risk-engine data, never from the LLM's number. */
  independentEstimate: number;
  deviation: number;
  flaggedForReview: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Risk-engine scores for the factors the recommendation names (case-insensitive). */
export function matchingRiskScores(riskFactors: string[], riskScores: RiskScoreLike[]): RiskScoreLike[] {
  const wanted = new Set(riskFactors.map((factor) => factor.toLowerCase()));
  return riskScores.filter((risk) => wanted.has(risk.name.toLowerCase()));
}

/**
 * Net confidence adjustment implied by the risk engine and ESG inputs:
 * high risk-factor scores and a high risk level lower confidence, strong
 * sector ESG raises it.
 */
export function riskAdjustment(
  input: Pick<ConfidenceInputs, "riskLevel" | "riskFactors" | "riskScores" | "sectorEsgScore">,
): number {
  const matched = matchingRiskScores(input.riskFactors, input.riskScores);
  const riskBase = matched.length ? average(matched.map((r) => r.score)) : 50;
  const riskPenalty = clamp((riskBase - 50) / 2.5, -6, 16);
  const esgBonus = input.sectorEsgScore === null ? 0 : clamp((input.sectorEsgScore - 70) / 5, -6, 7);
  const riskLevelPenalty = input.riskLevel === "high" ? 6 : input.riskLevel === "medium" ? 2 : -2;
  return esgBonus - riskPenalty - riskLevelPenalty;
}

/**
 * Cross-checks the LLM's self-reported confidence against an estimate the LLM
 * does not control (portfolio baseline + risk/ESG adjustment). Comparing the
 * LLM value against itself-plus-an-offset would only measure the offset, so the
 * flag would fire on risky deals rather than on a miscalibrated model.
 */
export function assessConfidence(input: ConfidenceInputs): ConfidenceAssessment {
  const adjustment = riskAdjustment(input);
  const baseline = input.portfolioConfidences.length
    ? average(input.portfolioConfidences)
    : DEFAULT_BASELINE_CONFIDENCE;

  const independentEstimate = Math.round(clamp(baseline + adjustment, 0, 100));
  const deviation = Math.abs(Math.round(input.llmConfidence) - independentEstimate);

  return {
    confidence: Math.round(clamp(input.llmConfidence + adjustment, 0, 100)),
    independentEstimate,
    deviation,
    flaggedForReview: deviation > CONFIDENCE_REVIEW_THRESHOLD,
  };
}
