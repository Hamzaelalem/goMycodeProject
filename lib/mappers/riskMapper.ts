import type { RiskFactorScore } from "@/types";
import type { RiskFactorScore as RiskFactorScoreRow } from "@prisma/client";

export function mapRiskFactorScoreFromDb(row: RiskFactorScoreRow): RiskFactorScore {
  return {
    id: row.id,
    name: row.name,
    score: row.score,
    previousScore: row.previousScore,
    sparklineData: row.sparklineData.map((n) => Number(n)),
    source: row.source as RiskFactorScore["source"],
    region: row.region,
  };
}
