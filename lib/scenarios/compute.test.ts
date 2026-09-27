import { describe, expect, it } from "vitest";

import {
  computeMonteCarloBands,
  computeScenarioCards,
  computeSensitivity,
  DEFAULT_BASE,
  DEFAULT_INPUTS,
  expectedIrr,
} from "./compute";

describe("computeScenarioCards", () => {
  it("orders scenarios bull > base > bear > stress on IRR", () => {
    const cards = computeScenarioCards(DEFAULT_INPUTS, DEFAULT_BASE);
    const irr = Object.fromEntries(cards.map((c) => [c.id, c.portfolioIrrPct]));
    expect(irr.bull).toBeGreaterThan(irr.base);
    expect(irr.base).toBeGreaterThan(irr.bear);
    expect(irr.bear).toBeGreaterThan(irr.stress);
  });

  it("probabilities sum to 100", () => {
    const cards = computeScenarioCards(DEFAULT_INPUTS, DEFAULT_BASE);
    expect(cards.reduce((sum, c) => sum + c.probabilityPct, 0)).toBe(100);
  });

  it("keeps risk scores within 0..100 under extreme inputs", () => {
    const cards = computeScenarioCards(
      { oilPrice: 0, usdLocalRate: 400, interestRate: 40, inflationRate: 60 },
      DEFAULT_BASE,
    );
    for (const card of cards) {
      expect(card.riskScore).toBeGreaterThanOrEqual(0);
      expect(card.riskScore).toBeLessThanOrEqual(100);
    }
  });

  it("lowers IRR when interest rates rise", () => {
    const base = computeScenarioCards(DEFAULT_INPUTS, DEFAULT_BASE)[0]!.portfolioIrrPct;
    const hiked = computeScenarioCards({ ...DEFAULT_INPUTS, interestRate: 9 }, DEFAULT_BASE)[0]!.portfolioIrrPct;
    expect(hiked).toBeLessThan(base);
  });
});

describe("expectedIrr", () => {
  it("is 0 when probabilities are all zero", () => {
    const cards = computeScenarioCards(DEFAULT_INPUTS, DEFAULT_BASE).map((c) => ({ ...c, probabilityPct: 0 }));
    expect(expectedIrr(cards)).toBe(0);
  });
});

describe("computeSensitivity", () => {
  it("is sorted by absolute swing, largest first", () => {
    const bars = computeSensitivity(DEFAULT_INPUTS, DEFAULT_BASE);
    const swings = bars.map((b) => Math.abs(b.swing));
    expect(swings).toEqual([...swings].sort((a, b) => b - a));
  });
});

describe("computeMonteCarloBands", () => {
  it("is deterministic and ordered p10 <= p50 <= p90", () => {
    const first = computeMonteCarloBands(DEFAULT_INPUTS, DEFAULT_BASE);
    expect(computeMonteCarloBands(DEFAULT_INPUTS, DEFAULT_BASE)).toEqual(first);
    for (const point of first) {
      expect(point.p10).toBeLessThanOrEqual(point.p50);
      expect(point.p50).toBeLessThanOrEqual(point.p90);
    }
  });
});
