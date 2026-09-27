import { describe, expect, it } from "vitest";

import {
  parseGenerateRecommendationRequest,
  RecommendationValidationError,
  SCORE_DIMENSIONS,
  validateGeneratedRecommendationJson,
} from "./schema";

const validOutput = {
  title: "Moroccan Solar Platform",
  region: "North Africa",
  sector: "Renewable Energy",
  country: "Morocco",
  capitalUsd: 50_000_000,
  irrPct: 14.2,
  horizonYears: 5,
  riskLevel: "medium",
  confidence: 72,
  tags: ["solar", "solar", "emerging-market"],
  rationale: "Strong irradiance and incentives.",
  scoreBreakdown: SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 65 })),
  riskFactors: ["FX Volatility"],
};

describe("validateGeneratedRecommendationJson", () => {
  it("accepts a well-formed recommendation and de-duplicates tags", () => {
    const result = validateGeneratedRecommendationJson(validOutput);
    expect(result.title).toBe("Moroccan Solar Platform");
    expect(result.tags).toEqual(["solar", "emerging-market"]);
    expect(result.scoreBreakdown).toHaveLength(SCORE_DIMENSIONS.length);
  });

  it("coerces numeric strings from small models and clamps out-of-range values", () => {
    const result = validateGeneratedRecommendationJson({
      ...validOutput,
      confidence: "140",
      irrPct: "-35",
      riskLevel: "HIGH",
    });
    expect(result.confidence).toBe(100);
    expect(result.irrPct).toBe(-20);
    expect(result.riskLevel).toBe("high");
  });

  it("accepts the object form of scoreBreakdown and defaults missing dimensions to 50", () => {
    const result = validateGeneratedRecommendationJson({
      ...validOutput,
      scoreBreakdown: { ESG: 90, "Market Size": "70" },
    });
    const byDimension = Object.fromEntries(result.scoreBreakdown.map((s) => [s.dimension, s.score]));
    expect(byDimension.ESG).toBe(90);
    expect(byDimension["Market Size"]).toBe(70);
    expect(byDimension.Liquidity).toBe(50);
  });

  it("rejects missing required fields and invalid risk levels", () => {
    expect(() => validateGeneratedRecommendationJson({ ...validOutput, title: "  " })).toThrow(
      RecommendationValidationError,
    );
    expect(() => validateGeneratedRecommendationJson({ ...validOutput, riskLevel: "extreme" })).toThrow(
      RecommendationValidationError,
    );
    expect(() => validateGeneratedRecommendationJson([validOutput])).toThrow(RecommendationValidationError);
  });
});

describe("parseGenerateRecommendationRequest", () => {
  it("treats an empty body as no constraints", () => {
    expect(parseGenerateRecommendationRequest(undefined)).toEqual({});
  });

  it("accepts groq as a provider", () => {
    expect(parseGenerateRecommendationRequest({ provider: "groq" }).provider).toBe("groq");
  });

  it("rejects unknown providers and bad capital ranges", () => {
    expect(() => parseGenerateRecommendationRequest({ provider: "openai" })).toThrow(/gemini, ollama, groq/);
    expect(() => parseGenerateRecommendationRequest({ capitalRangeUsd: [10, 5] })).toThrow(
      RecommendationValidationError,
    );
  });
});
