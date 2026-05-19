export type RiskFactorSource = "bloomberg" | "talkwalker" | "manual";
export type Trend = "up" | "down" | "stable";

export interface RiskFactorScore {
  id: string;
  name: string;
  score: number; // 0-100
  previousScore: number; // 0-100
  sparklineData: number[]; // last 7 days
  source: RiskFactorSource;
  region: string;
}

export interface RiskTrendPoint {
  date: string;
  risk: number;
}
