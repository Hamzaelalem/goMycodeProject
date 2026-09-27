import type { PortfolioHolding, PortfolioSummary } from "@/types";

/** Total AUM plus AUM-weighted IRR and risk across holdings. */
export function summarizePortfolio(holdings: PortfolioHolding[]): PortfolioSummary {
  const totalAum = holdings.reduce((sum, h) => sum + h.aumUsdB, 0);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const weighted = (pick: (h: PortfolioHolding) => number) =>
    totalAum > 0 ? holdings.reduce((sum, h) => sum + pick(h) * h.aumUsdB, 0) / totalAum : 0;

  return {
    totalAumB: round1(totalAum),
    weightedIrrPct: round1(weighted((h) => h.irrPct)),
    weightedRiskScore: Math.round(weighted((h) => h.riskScore)),
    holdings,
  };
}
