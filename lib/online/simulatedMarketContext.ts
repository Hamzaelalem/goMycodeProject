import type { GenerateRecommendationRequest } from "@/lib/recommendations/schema";

type MarketContext = {
  noveltyAngle: string;
  macroIndicators: string[];
  sectorMomentum: string[];
  policySignals: string[];
  riskNotes: string[];
  esgNotes: string[];
};

const SECTOR_CONTEXT: Record<string, MarketContext> = {
  solar: {
    noveltyAngle: "Favor a solar thesis that differs from the latest generated recommendation.",
    macroIndicators: [
      "Power demand is rising as grid reliability remains uneven in high-growth cities.",
      "Development finance institutions continue to favor renewable-energy projects with contracted offtake.",
    ],
    sectorMomentum: [
      "Utility-scale solar procurement pipelines are expanding, especially where PPAs are dollar-linked.",
      "Battery storage attachment rates are improving project bankability.",
    ],
    policySignals: [
      "Renewable auctions and tax incentives are increasingly tied to local-content commitments.",
    ],
    riskNotes: [
      "FX depreciation can pressure imported panel and battery costs.",
      "Grid interconnection delays remain the main execution bottleneck.",
    ],
    esgNotes: [
      "Solar projects score strongly on emissions reduction and energy-access KPIs.",
    ],
  },
  banking: {
    noveltyAngle: "Favor a banking thesis that differs from the latest generated recommendation.",
    macroIndicators: [
      "Higher-for-longer rates are widening margins but pressuring borrower affordability.",
      "SME credit demand remains resilient in markets with digital distribution.",
    ],
    sectorMomentum: [
      "Digital lending and transaction banking platforms are gaining share from branch-heavy incumbents.",
    ],
    policySignals: [
      "Regulators are tightening capital adequacy and consumer protection scrutiny.",
    ],
    riskNotes: [
      "NPL formation risk is elevated in FX-exposed borrower segments.",
    ],
    esgNotes: [
      "Financial inclusion and green loan portfolio growth improve ESG alignment.",
    ],
  },
  agriculture: {
    noveltyAngle: "Favor an agriculture thesis that differs from the latest generated recommendation.",
    macroIndicators: [
      "Food security spending is rising as governments seek resilient domestic supply chains.",
      "Input-cost volatility is still material but easing from recent peaks.",
    ],
    sectorMomentum: [
      "Irrigation, storage, and cold-chain assets show stronger defensibility than pure commodity exposure.",
    ],
    policySignals: [
      "Subsidies are increasingly linked to farmer inclusion and water-use efficiency.",
    ],
    riskNotes: [
      "Climate variability and logistics bottlenecks remain core downside risks.",
    ],
    esgNotes: [
      "Water efficiency, smallholder participation, and fair-wage tracking are central ESG drivers.",
    ],
  },
};

const DEFAULT_CONTEXT: MarketContext = {
  noveltyAngle: "Favor a new geography, sector, or capital-allocation thesis versus recent recommendations.",
  macroIndicators: [
    "Capital is rotating toward assets with visible cash yield and lower refinancing risk.",
    "FX volatility remains an important constraint on cross-border portfolio deployment.",
  ],
  sectorMomentum: [
    "Operators with pricing power and contracted revenue are receiving higher investment committee priority.",
  ],
  policySignals: [
    "Policy support is strongest where projects align with job creation, energy security, or inclusion targets.",
  ],
  riskNotes: [
    "Regulatory change, currency volatility, and liquidity timing should be reflected in risk-adjusted confidence.",
  ],
  esgNotes: [
    "Board approval is easier when the proposal has measurable ESG outcomes and auditable KPI ownership.",
  ],
};

const NOVELTY_ANGLES = [
  "Favor a different country than the most recent recommendation if the request does not force one.",
  "Favor a smaller bolt-on allocation with faster governance approval.",
  "Favor a downside-protected recommendation with lower capital at risk.",
  "Favor an ESG-led thesis where measurable KPIs improve board approval odds.",
  "Favor a high-conviction growth thesis only if risk scores support it.",
  "Favor a liquidity-preserving staged investment structure.",
];

function withFocus(line: string, request: GenerateRecommendationRequest): string {
  const focus = [request.focusSector, request.focusCountry ?? request.focusRegion]
    .filter(Boolean)
    .join(" / ");
  return focus ? `${focus}: ${line}` : line;
}

export function buildSimulatedMarketContext(
  request: GenerateRecommendationRequest,
  seed = 0,
): MarketContext {
  const key = request.focusSector?.toLowerCase() ?? "";
  const base = SECTOR_CONTEXT[key] ?? DEFAULT_CONTEXT;
  const noveltyAngle = NOVELTY_ANGLES[Math.abs(seed) % NOVELTY_ANGLES.length]!;

  return {
    noveltyAngle,
    macroIndicators: base.macroIndicators.map((line) => withFocus(line, request)),
    sectorMomentum: base.sectorMomentum.map((line) => withFocus(line, request)),
    policySignals: base.policySignals.map((line) => withFocus(line, request)),
    riskNotes: base.riskNotes.map((line) => withFocus(line, request)),
    esgNotes: base.esgNotes.map((line) => withFocus(line, request)),
  };
}
