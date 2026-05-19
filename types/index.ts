export type { Recommendation, RecommendationStatus, RiskLevel, ScoreDimension, RecommendationScoreBreakdown } from "./recommendation";
export type { Signal, SignalSeverity, SignalSource, SignalType } from "./signal";
export type { RiskFactorScore, RiskFactorSource, RiskTrendPoint, Trend } from "./risk";
export type { ScenarioCard, ScenarioId, ScenarioInputs, IrrProjectionPoint } from "./scenario";
export type { EsgPillar, EsgSectorInputs, EsgSectorKpi } from "./esg";
export type { WorkflowItem, WorkflowLogEntry, WorkflowStatus } from "./workflow";

// ---------------------------------------------------------------------------
// Backwards-compat re-exports for existing code (will be removed after refactor)
// ---------------------------------------------------------------------------
export type RiskBand = "low" | "medium" | "high";
export type WorkflowStage = "pending" | "review" | "approved" | "rejected" | "executed";

export interface ScoreBreakdown {
  label: string;
  value: number;
}

export interface RecommendationLegacy {
  id: string;
  title: string;
  region: string;
  sector: string;
  amountUsd: number;
  irrPct: number;
  risk: RiskBand;
  confidence: number; // 0..1
  rationale: string;
  scoreBreakdown: ScoreBreakdown[];
  esgScore: number;
  portfolioRiskContribution: number;
  workflowStage: WorkflowStage;
}

export interface RiskFactor {
  id: string;
  name: string;
  score: number;
  trend: "up" | "down" | "stable";
  weight: number;
}

export interface EsgBreakdown {
  environmental: number;
  social: number;
  governance: number;
  grade: string;
}

export interface EsgKpi {
  id: string;
  label: string;
  value: number;
  unit: string;
  pillar: "E" | "S" | "G";
}

export interface SignalItem {
  id: string;
  title: string;
  type: "macro" | "credit" | "esg" | "liquidity" | "regulatory";
  severity: "info" | "warning" | "critical";
  sentiment: number;
  timestamp: string;
  source?: string;
}

export interface ScenarioPreset {
  id: "base" | "bull" | "bear" | "stress";
  label: string;
  oil: number;
  fx: number;
  interest: number;
  inflation: number;
}

export interface ScenarioProjectionPoint {
  month: string;
  irr: number;
  aum: number;
  risk: number;
}

export interface DashboardKpis {
  totalRecommendations: number;
  avgConfidence: number;
  portfolioRisk: number;
  esgScore: number;
}
