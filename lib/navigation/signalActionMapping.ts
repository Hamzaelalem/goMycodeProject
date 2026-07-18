import type { Signal, ScenarioInputs } from "@/types";

/**
 * Returns scenario inputs mapped to the specific market/regulatory/macro risk
 * described by a given Signal, allowing one-click stress-testing.
 */
export function getMacroInputsForSignal(s: Signal): ScenarioInputs {
  // Start with default base inputs:
  const inputs: ScenarioInputs = {
    oilPrice: 97,
    fxDeltaPct: -5,
    interestRate: 6,
    inflationRate: 8,
  };

  const titleLower = s.title.toLowerCase();

  // Specific overrides based on signal content/metadata
  if (s.id === "s-003" || titleLower.includes("oil") || titleLower.includes("energy")) {
    inputs.oilPrice = 115;      // Energy shock
    inputs.inflationRate = 10.5; // Cost-push inflation
  } else if (
    titleLower.includes("rate") ||
    titleLower.includes("inflation") ||
    titleLower.includes("yield") ||
    titleLower.includes("interest") ||
    s.id === "s-012"
  ) {
    inputs.interestRate = 9.5;   // Moneta policy tightening
    inputs.inflationRate = 12.0;  // High inflation print
  } else if (
    titleLower.includes("fx") ||
    titleLower.includes("hedging") ||
    titleLower.includes("currency") ||
    s.id === "s-010"
  ) {
    inputs.fxDeltaPct = -18;     // FX depreciation stress
    inputs.inflationRate = 9.0;
  } else {
    // Fallback scaling based on signal severity
    if (s.severity === "critical") {
      inputs.interestRate = 8.5;
      inputs.inflationRate = 9.5;
      inputs.oilPrice = 80;
      inputs.fxDeltaPct = -12;
    } else if (s.severity === "high") {
      inputs.interestRate = 7.5;
      inputs.inflationRate = 8.5;
      inputs.oilPrice = 85;
      inputs.fxDeltaPct = -8;
    } else if (s.severity === "medium") {
      inputs.interestRate = 6.8;
      inputs.inflationRate = 8.2;
    }
  }

  return inputs;
}
