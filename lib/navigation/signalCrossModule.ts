import type { Signal } from "@/types";

export function routeForSignal(s: Signal): string {
  switch (s.type) {
    case "risk":
      return "/risk";
    case "opportunity":
      return "/recommendations";
    case "deal":
      return "/workflow";
    case "policy":
      return "/esg";
    case "market":
    default:
      return "/live-feed";
  }
}

export type SignalNavigationActions = {
  setSelectedSignal: (s: Signal | null) => void;
  setActiveRegionFilter: (region: string | null) => void;
  setActiveSectorFilter: (sector: string | null) => void;
  setActiveRiskFactor: (name: string | null) => void;
  setWorkflowFocusRecommendationId: (id: string | null) => void;
};

/**
 * Applies cross-module filter sync when user clicks a signal (or picks one from search).
 * Mirrors the product spec: risk → risk + factor; opportunity → recommendations + sector;
 * deal → workflow + target id; policy → ESG + sector (+ region for context).
 */
export function applySignalCrossModuleLinks(signal: Signal, a: SignalNavigationActions): void {
  a.setSelectedSignal(signal);

  switch (signal.type) {
    case "risk":
      a.setActiveRegionFilter(signal.region);
      a.setActiveSectorFilter(signal.sector);
      a.setActiveRiskFactor(signal.riskFactor ?? null);
      a.setWorkflowFocusRecommendationId(null);
      break;
    case "opportunity":
      a.setActiveRegionFilter(signal.region);
      a.setActiveSectorFilter(signal.sector);
      a.setActiveRiskFactor(null);
      a.setWorkflowFocusRecommendationId(null);
      break;
    case "policy":
      a.setActiveRegionFilter(signal.region);
      a.setActiveSectorFilter(signal.sector);
      a.setActiveRiskFactor(null);
      a.setWorkflowFocusRecommendationId(null);
      break;
    case "deal":
      a.setActiveRegionFilter(signal.region);
      a.setActiveSectorFilter(signal.sector);
      a.setActiveRiskFactor(null);
      a.setWorkflowFocusRecommendationId(signal.workflowItemId ?? null);
      break;
    case "market":
    default:
      a.setActiveRegionFilter(signal.region);
      a.setActiveSectorFilter(signal.sector);
      a.setActiveRiskFactor(null);
      a.setWorkflowFocusRecommendationId(null);
      break;
  }
}
