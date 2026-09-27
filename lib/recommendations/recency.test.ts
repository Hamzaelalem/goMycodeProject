import { describe, expect, it } from "vitest";

import { isNewRecommendation, NEW_WINDOW_MS, sortNewestFirst } from "./recency";

const now = Date.parse("2026-09-27T16:00:00Z");
const rec = (rank: number, dataSource: "mock" | "live", hoursAgo: number) => ({
  rank,
  dataSource,
  generatedAt: new Date(now - hoursAgo * 3_600_000).toISOString(),
});

describe("sortNewestFirst", () => {
  it("puts AI-generated recommendations first, newest on top, then seeds by rank", () => {
    const sorted = sortNewestFirst([rec(2, "mock", 0.1), rec(13, "live", 5), rec(1, "mock", 0.2), rec(14, "live", 1)]);
    expect(sorted.map((r) => r.rank)).toEqual([14, 13, 1, 2]);
  });
});

describe("isNewRecommendation", () => {
  it("is true only for AI-generated recommendations inside the window", () => {
    expect(isNewRecommendation(rec(14, "live", 1), now)).toBe(true);
    expect(isNewRecommendation(rec(14, "live", NEW_WINDOW_MS / 3_600_000 + 1), now)).toBe(false);
    expect(isNewRecommendation(rec(1, "mock", 0.1), now)).toBe(false);
  });
});
