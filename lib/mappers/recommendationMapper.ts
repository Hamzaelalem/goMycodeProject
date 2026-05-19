import type { Recommendation } from "@/types";
import type { Recommendation as RecommendationRow } from "@prisma/client";

export function mapRecommendationFromDb(row: RecommendationRow): Recommendation {
  return {
    id: row.id,
    rank: row.rank,
    title: row.title,
    region: row.region,
    sector: row.sector,
    country: row.country,
    capitalUsd: row.capitalUsd,
    irrPct: row.irrPct,
    horizonYears: row.horizonYears,
    riskLevel: row.riskLevel as Recommendation["riskLevel"],
    confidence: row.confidence,
    status: row.status as Recommendation["status"],
    tags: row.tags,
    rationale: row.rationale,
    scoreBreakdown: row.scoreBreakdown as unknown as Recommendation["scoreBreakdown"],
    modelVersion: row.modelVersion,
    generatedAt: row.generatedAt.toISOString(),
    riskFactors: row.riskFactors,
  };
}
