import type { Recommendation } from "@/types";

/** AI-generated recommendations younger than this get a "New" badge. */
export const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isNewRecommendation(rec: Pick<Recommendation, "dataSource" | "generatedAt">, now: number): boolean {
  if (rec.dataSource !== "live") return false;
  const generated = Date.parse(rec.generatedAt);
  return Number.isFinite(generated) && now - generated < NEW_WINDOW_MS;
}

/**
 * Newest first: AI-generated recommendations by generation time (latest on top),
 * then the seeded portfolio in its original rank order.
 */
export function sortNewestFirst<T extends Pick<Recommendation, "dataSource" | "generatedAt" | "rank">>(recs: T[]): T[] {
  return [...recs].sort((a, b) => {
    const aLive = a.dataSource === "live";
    const bLive = b.dataSource === "live";
    if (aLive !== bLive) return aLive ? -1 : 1;
    if (aLive) return Date.parse(b.generatedAt) - Date.parse(a.generatedAt) || a.rank - b.rank;
    return a.rank - b.rank;
  });
}
