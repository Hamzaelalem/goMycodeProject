import type { PortfolioHolding, PortfolioSummary } from "@/types";

/**
 * Mock portfolio powering the Scenario Modelling Engine's portfolio-level base case.
 * AUM in $B; IRR % and composite risk (0-100) per holding. These are illustrative
 * demo figures, not live positions.
 */
export const portfolioHoldings: PortfolioHolding[] = [
  // Solar & Energy
  { id: "hold-solar-1", name: "Sahara Solar PPA", sector: "Solar & Energy", region: "North Africa", aumUsdB: 0.9, irrPct: 16.2, riskScore: 49 },
  { id: "hold-solar-2", name: "Rift Valley Solar Cluster", sector: "Solar & Energy", region: "East Africa", aumUsdB: 0.7, irrPct: 17.4, riskScore: 52 },
  // Oil & Gas
  { id: "hold-gas-1", name: "Offshore Gas Expansion", sector: "Oil & Gas", region: "West Africa", aumUsdB: 1.6, irrPct: 14.8, riskScore: 66 },
  { id: "hold-gas-2", name: "Gulf LNG Terminal Stake", sector: "Oil & Gas", region: "Middle East", aumUsdB: 1.3, irrPct: 13.2, riskScore: 63 },
  // Properties
  { id: "hold-prop-1", name: "Casablanca Mixed-Use Towers", sector: "Properties", region: "North Africa", aumUsdB: 1.1, irrPct: 11.8, riskScore: 47 },
  { id: "hold-prop-2", name: "Nairobi Grade-A Offices", sector: "Properties", region: "East Africa", aumUsdB: 0.8, irrPct: 12.6, riskScore: 51 },
  // Banking
  { id: "hold-bank-1", name: "Maghreb Fintech Growth", sector: "Banking", region: "North Africa", aumUsdB: 0.6, irrPct: 21.5, riskScore: 72 },
  { id: "hold-bank-2", name: "Pan-African Retail Bank", sector: "Banking", region: "Sub-Saharan Africa", aumUsdB: 1.0, irrPct: 18.3, riskScore: 68 },
  // Hospitals
  { id: "hold-hosp-1", name: "Cairo Specialty Hospitals", sector: "Hospitals", region: "North Africa", aumUsdB: 0.7, irrPct: 12.9, riskScore: 45 },
  { id: "hold-hosp-2", name: "Gulf Care Network", sector: "Hospitals", region: "Middle East", aumUsdB: 0.9, irrPct: 13.7, riskScore: 43 },
  // Hotels
  { id: "hold-hotel-1", name: "Red Sea Resorts Portfolio", sector: "Hotels", region: "Middle East", aumUsdB: 0.8, irrPct: 14.1, riskScore: 57 },
  { id: "hold-hotel-2", name: "Zanzibar Coastal Hotels", sector: "Hotels", region: "East Africa", aumUsdB: 0.5, irrPct: 15.6, riskScore: 61 },
  // Water Treatment
  { id: "hold-water-1", name: "Gulf Desalination", sector: "Water Treatment", region: "Middle East", aumUsdB: 0.8, irrPct: 12.1, riskScore: 44 },
  { id: "hold-water-2", name: "Nile Delta Water Reuse", sector: "Water Treatment", region: "North Africa", aumUsdB: 0.6, irrPct: 11.4, riskScore: 42 },
  // Agriculture
  { id: "hold-agri-1", name: "Sahel Irrigated Farms", sector: "Agriculture", region: "West Africa", aumUsdB: 0.5, irrPct: 13.8, riskScore: 59 },
  { id: "hold-agri-2", name: "Ethiopian Agri-Processing", sector: "Agriculture", region: "East Africa", aumUsdB: 0.6, irrPct: 15.1, riskScore: 62 },
  // Logistics
  { id: "hold-log-1", name: "Regional Logistics Corridor", sector: "Logistics", region: "Sub-Saharan Africa", aumUsdB: 0.9, irrPct: 13.0, riskScore: 55 },
  { id: "hold-log-2", name: "Red Sea Port Handling", sector: "Logistics", region: "East Africa", aumUsdB: 1.0, irrPct: 12.4, riskScore: 53 },
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
