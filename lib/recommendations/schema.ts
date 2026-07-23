import type {
  Recommendation,
  RecommendationScoreBreakdown,
  RiskLevel,
  ScoreDimension,
} from "@/types";

export type LlmProvider = "gemini" | "ollama" | "groq";

export const LLM_PROVIDERS: LlmProvider[] = ["gemini", "ollama", "groq"];

export type GenerateRecommendationRequest = {
  focusSector?: string;
  focusRegion?: string;
  focusCountry?: string;
  capitalRangeUsd?: [number, number];
  riskAppetite?: RiskLevel;
  horizonYears?: number;
  /** Force a specific LLM; when omitted, falls back to env-based selection. */
  provider?: LlmProvider;
};

export type GeneratedRecommendationInput = Omit<
  Recommendation,
  "id" | "rank" | "status" | "modelVersion" | "generatedAt" | "dataSource"
>;

export class RecommendationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecommendationValidationError";
  }
}

export const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high"];

export const SCORE_DIMENSIONS: ScoreDimension[] = [
  "Market Size",
  "ESG",
  "IRR",
  "Risk",
  "Portfolio Fit",
  "Liquidity",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function cleanNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  // Small LLMs (1b–3b) sometimes emit numbers as strings — coerce them.
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = cleanOptionalString(record[key]);
  if (!value) throw new RecommendationValidationError(`${key} must be a non-empty string`);
  return value;
}

function requireBoundedNumber(
  record: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): number {
  const value = cleanNumber(record[key]);
  if (value === undefined) {
    throw new RecommendationValidationError(`${key} must be a number (got ${typeof record[key]})`);
  }
  // Clamp instead of rejecting — salvages responses where the model is slightly out of range.
  return clampNumber(value, min, max);
}

function parseStringArray(value: unknown, key: string): string[] {
  if (!Array.isArray(value)) {
    throw new RecommendationValidationError(`${key} must be an array`);
  }
  const cleaned = value
    .map((item) => cleanOptionalString(item))
    .filter((item): item is string => Boolean(item));
  if (!cleaned.length) {
    throw new RecommendationValidationError(`${key} must contain at least one string`);
  }
  return Array.from(new Set(cleaned)).slice(0, 8);
}

function parseScoreBreakdown(value: unknown): RecommendationScoreBreakdown[] {
  const byDimension = new Map<ScoreDimension, number>();

  if (Array.isArray(value)) {
    // Standard array format: [{dimension: "Market Size", score: 80}, ...]
    for (const item of value) {
      if (!isRecord(item)) continue;
      const dimension = item.dimension;
      const score = cleanNumber(item.score);
      if (
        typeof dimension === "string" &&
        SCORE_DIMENSIONS.includes(dimension as ScoreDimension) &&
        score !== undefined
      ) {
        byDimension.set(dimension as ScoreDimension, Math.round(clampNumber(score, 0, 100)));
      }
    }
  } else if (isRecord(value)) {
    // Object format from small models: {"Market Size": 80, "ESG": 90, ...}
    for (const [key, val] of Object.entries(value)) {
      const score = cleanNumber(val);
      if (SCORE_DIMENSIONS.includes(key as ScoreDimension) && score !== undefined) {
        byDimension.set(key as ScoreDimension, Math.round(clampNumber(score, 0, 100)));
      }
    }
  }
  // If neither format matched, all dimensions default to 50 below.

  return SCORE_DIMENSIONS.map((dimension) => ({
    dimension,
    score: byDimension.get(dimension) ?? 50,
  }));
}

export function parseGenerateRecommendationRequest(
  value: unknown,
): GenerateRecommendationRequest {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) {
    throw new RecommendationValidationError("Request body must be a JSON object");
  }

  const riskAppetite = cleanOptionalString(value.riskAppetite);
  if (riskAppetite && !RISK_LEVELS.includes(riskAppetite as RiskLevel)) {
    throw new RecommendationValidationError("riskAppetite must be low, medium, or high");
  }

  const provider = cleanOptionalString(value.provider);
  if (provider && !LLM_PROVIDERS.includes(provider as LlmProvider)) {
    throw new RecommendationValidationError("provider must be gemini or ollama");
  }

  const horizonYears = cleanNumber(value.horizonYears);
  if (horizonYears !== undefined && (horizonYears < 1 || horizonYears > 15)) {
    throw new RecommendationValidationError("horizonYears must be between 1 and 15");
  }

  let capitalRangeUsd: [number, number] | undefined;
  if (value.capitalRangeUsd !== undefined) {
    if (!Array.isArray(value.capitalRangeUsd) || value.capitalRangeUsd.length !== 2) {
      throw new RecommendationValidationError("capitalRangeUsd must be [min, max]");
    }
    const min = cleanNumber(value.capitalRangeUsd[0]);
    const max = cleanNumber(value.capitalRangeUsd[1]);
    if (min === undefined || max === undefined || min <= 0 || max <= min) {
      throw new RecommendationValidationError("capitalRangeUsd must contain positive ascending numbers");
    }
    capitalRangeUsd = [min, max];
  }

  return {
    focusSector: cleanOptionalString(value.focusSector),
    focusRegion: cleanOptionalString(value.focusRegion),
    focusCountry: cleanOptionalString(value.focusCountry),
    capitalRangeUsd,
    riskAppetite: riskAppetite as RiskLevel | undefined,
    horizonYears: horizonYears !== undefined ? Math.round(horizonYears) : undefined,
    provider: provider as LlmProvider | undefined,
  };
}

export function validateGeneratedRecommendationJson(
  value: unknown,
): GeneratedRecommendationInput {
  if (!isRecord(value)) {
    throw new RecommendationValidationError("LLM output must be a JSON object");
  }

  const riskLevel = requireString(value, "riskLevel").toLowerCase();
  if (!RISK_LEVELS.includes(riskLevel as RiskLevel)) {
    throw new RecommendationValidationError("riskLevel must be low, medium, or high");
  }

  return {
    title: requireString(value, "title").slice(0, 140),
    region: requireString(value, "region").slice(0, 80),
    sector: requireString(value, "sector").slice(0, 80),
    country: requireString(value, "country").slice(0, 80),
    capitalUsd: Math.round(requireBoundedNumber(value, "capitalUsd", 1, 10_000_000_000)),
    irrPct: Number(requireBoundedNumber(value, "irrPct", -20, 50).toFixed(1)),
    horizonYears: Math.round(requireBoundedNumber(value, "horizonYears", 1, 15)),
    riskLevel: riskLevel as RiskLevel,
    confidence: Math.round(requireBoundedNumber(value, "confidence", 0, 100)),
    tags: parseStringArray(value.tags, "tags"),
    rationale: requireString(value, "rationale").slice(0, 1800),
    scoreBreakdown: parseScoreBreakdown(value.scoreBreakdown),
    riskFactors: parseStringArray(value.riskFactors, "riskFactors"),
  };
}

