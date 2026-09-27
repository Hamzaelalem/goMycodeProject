import { describe, expect, it } from "vitest";

import { DEAL_WORDS, POLICY_WORDS } from "./keywords";

describe("DEAL_WORDS", () => {
  it("does not treat interest-rate moves as deals", () => {
    expect(DEAL_WORDS.test("Norway central bank raises interest rate, may hike again")).toBe(false);
    expect(DEAL_WORDS.test("Fed raising rates again")).toBe(false);
  });

  it("matches fundraising and M&A headlines", () => {
    expect(DEAL_WORDS.test("Solar startup raises $50M in Series B")).toBe(true);
    expect(DEAL_WORDS.test("Fintech raised 20 million from investors")).toBe(true);
    expect(DEAL_WORDS.test("Bank acquires regional lender")).toBe(true);
    expect(DEAL_WORDS.test("Utility signs $2bn takeover")).toBe(true);
  });
});

describe("POLICY_WORDS", () => {
  it("classifies rate decisions as policy", () => {
    expect(POLICY_WORDS.test("Norway central bank raises interest rate, may hike again")).toBe(true);
  });
});
