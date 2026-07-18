import type { PortfolioHolding, PortfolioSummary } from "@/types";

/**
 * Mock portfolio powering the Scenario Modelling Engine's portfolio-level base case.
 * AUM in $B; IRR % and composite risk (0-100) per holding. These are illustrative
 * demo figures, not live positions.
 */
export const portfolioHoldings: PortfolioHolding[] = [
  { id: "hold-grid", name: "Sonelgaz Grid Modernization", sector: "Utilities", region: "North Africa", aumUsdB: 1.4, irrPct: 13.5, riskScore: 58 },
  { id: "hold-solar", name: "Sahara Solar PPA", sector: "Renewables", region: "North Africa", aumUsdB: 0.9, irrPct: 16.2, riskScore: 49 },
  { id: "hold-water", name: "Gulf Desalination", sector: "Water", region: "Middle East", aumUsdB: 0.8, irrPct: 12.1, riskScore: 44 },
  { id: "hold-fintech", name: "Maghreb Fintech Growth", sector: "Financials", region: "North Africa", aumUsdB: 0.6, irrPct: 21.5, riskScore: 72 },
  { id: "hold-gas", name: "Offshore Gas Expansion", sector: "Oil & Gas", region: "West Africa", aumUsdB: 1.6, irrPct: 14.8, riskScore: 66 },
  { id: "hold-logistics", name: "Regional Logistics Corridor", sector: "Infrastructure", region: "Sub-Saharan Africa", aumUsdB: 0.9, irrPct: 13.0, riskScore: 55 },
];

function summarize(holdings: PortfolioHolding[]): PortfolioSummary {
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

export const mockPortfolio: PortfolioSummary = summarize(portfolioHoldings);
