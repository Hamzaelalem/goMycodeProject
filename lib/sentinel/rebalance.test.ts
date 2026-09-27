import { describe, expect, it } from "vitest";

import type { PortfolioHolding } from "@/types";
import {
  applyGuardrails,
  type AssetRebalance,
  fallbackDirective,
  type Headline,
  MAX_ADJUSTMENT_PCT,
  MIN_ACTIONABLE_CONFIDENCE,
  portfolioWeights,
  simulateRebalance,
} from "./rebalance";

const holding: PortfolioHolding = {
  id: "h1",
  name: "Test Solar",
  sector: "Solar & Energy",
  region: "North Africa",
  aumUsdB: 1,
  irrPct: 15,
  riskScore: 55,
};

const headline = (title: string): Headline => ({
  title,
  publisher: "Test Wire",
  link: `https://example.com/${encodeURIComponent(title)}`,
  publishedAt: "2026-09-27T00:00:00.000Z",
});

const ctx = { currentWeightPct: 10, headlineCount: 3 };

describe("applyGuardrails", () => {
  it("keeps a well-formed BUY and signs the adjustment", () => {
    const d = applyGuardrails(
      { action: "BUY", targetAdjustmentPct: 3, confidence: 80, riskScore: 40, rationale: "r", keyCatalyst: "k" },
      ctx,
    );
    expect(d).toMatchObject({ action: "BUY", targetAdjustmentPct: 3, confidence: 80, riskScore: 40 });
    expect(d.guardrails).toEqual([]);
  });

  it("makes SELL adjustments negative even if the model sent a positive number", () => {
    const d = applyGuardrails({ action: "sell", targetAdjustmentPct: 2, confidence: 90 }, ctx);
    expect(d.action).toBe("SELL");
    expect(d.targetAdjustmentPct).toBe(-2);
  });

  it(`caps adjustments at ±${MAX_ADJUSTMENT_PCT}pp`, () => {
    const d = applyGuardrails({ action: "BUY", targetAdjustmentPct: 40, confidence: 90 }, ctx);
    expect(d.targetAdjustmentPct).toBe(MAX_ADJUSTMENT_PCT);
    expect(d.guardrails.join()).toMatch(/capped/);
  });

  it("downgrades low-confidence directives to HOLD", () => {
    const d = applyGuardrails({ action: "SELL", targetAdjustmentPct: 3, confidence: MIN_ACTIONABLE_CONFIDENCE - 1 }, ctx);
    expect(d.action).toBe("HOLD");
    expect(d.targetAdjustmentPct).toBe(0);
  });

  it("downgrades to HOLD when there is no news evidence", () => {
    const d = applyGuardrails({ action: "BUY", targetAdjustmentPct: 3, confidence: 95 }, { ...ctx, headlineCount: 0 });
    expect(d.action).toBe("HOLD");
  });

  it("never sells more than the current weight", () => {
    const d = applyGuardrails({ action: "SELL", targetAdjustmentPct: 5, confidence: 90 }, { ...ctx, currentWeightPct: 1.2 });
    expect(d.targetAdjustmentPct).toBe(-1.2);
  });

  it("treats unknown actions and junk numbers safely", () => {
    const d = applyGuardrails({ action: "YOLO", targetAdjustmentPct: "abc", confidence: 500, riskScore: -3 }, ctx);
    expect(d).toMatchObject({ action: "HOLD", targetAdjustmentPct: 0, confidence: 100, riskScore: 1 });
  });
});

describe("fallbackDirective", () => {
  it("is deterministic", () => {
    const headlines = [headline("Solar output hits record growth"), headline("New policy framework")];
    expect(fallbackDirective(holding, headlines, 10)).toEqual(fallbackDirective(holding, headlines, 10));
  });

  it("buys on positive news and sells on crisis news", () => {
    const positive = [headline("Solar boom: record growth"), headline("Profit surge after expansion"), headline("Rally continues")];
    const negative = [headline("Crisis deepens as default fears grow"), headline("Sanction war hits sector"), headline("Plunge after fraud probe")];
    expect(fallbackDirective(holding, positive, 10).action).toBe("BUY");
    expect(fallbackDirective(holding, negative, 10).action).toBe("SELL");
  });

  it("holds when there are no headlines", () => {
    const d = fallbackDirective(holding, [], 10);
    expect(d.action).toBe("HOLD");
    expect(d.keyCatalyst).toMatch(/No live headlines/);
  });
});

describe("weights", () => {
  it("portfolioWeights sums to ~100", () => {
    const weights = portfolioWeights([holding, { ...holding, id: "h2", aumUsdB: 3 }]);
    expect(weights).toEqual({ h1: 25, h2: 75 });
  });

  it("simulateRebalance applies directives and renormalises to 100%", () => {
    const asset = (id: string, weight: number, adj: number): AssetRebalance => ({
      holdingId: id,
      name: id,
      sector: "s",
      region: "r",
      currentWeightPct: weight,
      newsQuery: "q",
      headlines: [],
      directive: { action: adj > 0 ? "BUY" : adj < 0 ? "SELL" : "HOLD", targetAdjustmentPct: adj, confidence: 80, riskScore: 50, rationale: "", keyCatalyst: "", guardrails: [] },
    });
    const result = simulateRebalance([asset("a", 50, 5), asset("b", 50, -5)]);
    expect(result).toEqual({ a: 55, b: 45 });
    const total = Object.values(simulateRebalance([asset("a", 40, 5), asset("b", 60, 0)])).reduce((x, y) => x + y, 0);
    expect(total).toBeCloseTo(100, 0);
  });
});
