export type RecommendationStatus =
  | "approved"
  | "under_review"
  | "pending_review"
  | "rejected";

export type RiskLevel = "low" | "medium" | "high";

export type ScoreDimension =
  | "Market Size"
  | "ESG"
  | "IRR"
  | "Risk"
  | "Portfolio Fit"
  | "Liquidity";

export interface RecommendationScoreBreakdown {
  dimension: ScoreDimension;
  score: number; // 0-100
}

export interface Recommendation {
  id: string;
  rank: number; // 1..N
  title: string;
  region: string;
  sector: string;
  country: string;
  capitalUsd: number;
  irrPct: number;
  horizonYears: number;
  riskLevel: RiskLevel;
  confidence: number; // 0-100
  status: RecommendationStatus;
  tags: string[];
  rationale: string;
  scoreBreakdown: RecommendationScoreBreakdown[]; // 6 dims
  modelVersion: string;
  generatedAt: string; // ISO
  dataSource: "mock" | "live"; // "mock" = seeded fixture, "live" = pipeline-produced
  // Cross-module tags
  riskFactors: string[]; // names matching risk factor list
}

/** One entry of a recommendation's durable audit trail (`RecommendationAuditLog`). */
export interface RecommendationAuditEntry {
  id: string;
  action: string; // "generated" | "generated_flagged" | status transitions
  comment: string | null;
  at: string; // ISO
}

/** GET /api/recommendations/[id] response: the rec plus its audit trail. */
export interface RecommendationDetail extends Recommendation {
  auditLogs: RecommendationAuditEntry[];
}

/** Tag appended by the Step-5 guardrail when confidence variance exceeds threshold. */
export const REVIEW_FLAG_TAG = "Needs Review";

/** True when a recommendation was flagged for human review by the guardrail. */
export function isFlaggedForReview(rec: Pick<Recommendation, "tags">): boolean {
  return rec.tags.includes(REVIEW_FLAG_TAG);
}
