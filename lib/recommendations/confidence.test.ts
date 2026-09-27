import { describe, expect, it } from "vitest";

import {
  assessConfidence,
  CONFIDENCE_REVIEW_THRESHOLD,
  DEFAULT_BASELINE_CONFIDENCE,
  riskAdjustment,
  type ConfidenceInputs,
} from "./confidence";

const neutral: ConfidenceInputs = {
  llmConfidence: 80,
  riskLevel: "medium",
  riskFactors: [],
  riskScores: [],
  sectorEsgScore: null,
  portfolioConfidences: [80, 80],
};

describe("riskAdjustment", () => {
  it("is only the risk-level penalty when no factors match and ESG is unknown", () => {
    expect(riskAdjustment({ ...neutral, riskLevel: "low" })).toBe(2);
    expect(riskAdjustment({ ...neutral, riskLevel: "medium" })).toBe(-2);
    expect(riskAdjustment({ ...neutral, riskLevel: "high" })).toBe(-6);
  });

  it("matches risk factors case-insensitively and caps the penalty", () => {
    const adjustment = riskAdjustment({
      ...neutral,
      riskFactors: ["fx volatility"],
      riskScores: [{ name: "FX Volatility", score: 100 }],
    });
    // riskPenalty clamps at 16, plus the medium-level penalty of 2.
    expect(adjustment).toBe(-18);
  });

  it("rewards strong sector ESG, capped at +7", () => {
    expect(riskAdjustment({ ...neutral, sectorEsgScore: 200 })).toBe(7 - 2);
  });
});

describe("assessConfidence", () => {
  it("does not flag an LLM that agrees with the portfolio baseline", () => {
    const result = assessConfidence(neutral);
    expect(result.independentEstimate).toBe(78);
    expect(result.confidence).toBe(78);
    expect(result.flaggedForReview).toBe(false);
  });

  it("flags an overconfident LLM even on a low-risk deal", () => {
    // The old check compared the LLM value against itself-minus-an-offset, so a
    // low-risk deal could never be flagged no matter how miscalibrated the model.
    const result = assessConfidence({ ...neutral, riskLevel: "low", llmConfidence: 100, portfolioConfidences: [60] });
    expect(result.independentEstimate).toBe(62);
    expect(result.deviation).toBeGreaterThan(CONFIDENCE_REVIEW_THRESHOLD);
    expect(result.flaggedForReview).toBe(true);
  });

  it("flags an underconfident LLM too", () => {
    const result = assessConfidence({ ...neutral, llmConfidence: 40 });
    expect(result.flaggedForReview).toBe(true);
  });

  it("falls back to the default baseline for an empty portfolio", () => {
    const result = assessConfidence({ ...neutral, portfolioConfidences: [] });
    expect(result.independentEstimate).toBe(DEFAULT_BASELINE_CONFIDENCE - 2);
  });

  it("clamps stored confidence to 0..100", () => {
    const result = assessConfidence({
      ...neutral,
      llmConfidence: 5,
      riskLevel: "high",
      riskFactors: ["Credit"],
      riskScores: [{ name: "Credit", score: 100 }],
    });
    expect(result.confidence).toBe(0);
  });
});
