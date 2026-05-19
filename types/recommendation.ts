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
  // Cross-module tags
  riskFactors: string[]; // names matching risk factor list
}
