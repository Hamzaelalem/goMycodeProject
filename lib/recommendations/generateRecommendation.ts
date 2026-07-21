import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { generateJsonWithGemini, GEMINI_MODEL } from "@/lib/llm/gemini";
import { generateJsonWithOllama, OLLAMA_MODEL } from "@/lib/llm/ollama";
import { prisma } from "@/lib/db/prisma";
import { mapRecommendationFromDb } from "@/lib/mappers/recommendationMapper";
import { buildSimulatedMarketContext } from "@/lib/online/simulatedMarketContext";
import { searchDocuments, type SearchResult } from "@/lib/rag/search";
import {
  type GeneratedRecommendationInput,
  type GenerateRecommendationRequest,
  SCORE_DIMENSIONS,
  validateGeneratedRecommendationJson,
} from "@/lib/recommendations/schema";
import type { Recommendation } from "@/types";
import { recommendations as mockRecommendations } from "@/mock-data/recommendations";
import { seededSignals as mockSignals } from "@/mock-data/signals";
import { riskScores as mockRiskScores } from "@/mock-data/riskScores";
import { esgInputs as mockEsgInputs } from "@/mock-data/esgInputs";

/**
 * Brief §4.1 Step 5: if the LLM's confidence deviates from the risk-adjusted
 * estimate by more than this many points, flag the recommendation for human
 * review rather than surfacing it as a normal high-confidence result.
 */
const CONFIDENCE_REVIEW_THRESHOLD = 15;
const REVIEW_FLAG_TAG = "Needs Review";

export class MalformedLlmOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedLlmOutputError";
  }
}

async function generateRecommendationJson(prompt: string): Promise<{
  modelVersion: string;
  output: unknown;
}> {
  if (process.env.GEMINI_API_KEY) {
    return {
      modelVersion: `gemini:${GEMINI_MODEL}`,
      output: await generateJsonWithGemini(prompt),
    };
  }

  return {
    modelVersion: `ollama:${OLLAMA_MODEL}`,
    output: await generateJsonWithOllama(prompt),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function compactText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function buildRagQuery(request: GenerateRecommendationRequest): string {
  return [
    "investment recommendation",
    request.focusSector,
    request.focusRegion,
    request.focusCountry,
    request.riskAppetite ? `${request.riskAppetite} risk appetite` : undefined,
  ]
    .filter(Boolean)
    .join(" ");
}

function summarizeRag(results: SearchResult[]): string {
  if (!results.length) return "No RAG documents were retrieved.";
  return results
    .slice(0, 3)
    .map(
      (result, index) =>
        `Source ${index + 1}: ${result.title} (${result.source}, chunk ${result.chunk})\n${compactText(result.content, 900)}`,
    )
    .join("\n\n---\n\n");
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

type RiskScoreLike = {
  name: string;
  score: number;
};

function computeConfidence(
  generated: GeneratedRecommendationInput,
  riskScores: RiskScoreLike[],
  sectorEsgScore: number | null,
): number {
  const matchingRiskScores = riskScores.filter((risk) =>
    generated.riskFactors.some(
      (factor) => factor.toLowerCase() === risk.name.toLowerCase(),
    ),
  );
  const riskBase = matchingRiskScores.length ? average(matchingRiskScores.map((r) => r.score)) : 50;
  const riskPenalty = clamp((riskBase - 50) / 2.5, -6, 16);
  const esgBonus = sectorEsgScore === null ? 0 : clamp((sectorEsgScore - 70) / 5, -6, 7);
  const riskLevelPenalty =
    generated.riskLevel === "high" ? 6 : generated.riskLevel === "medium" ? 2 : -2;

  return Math.round(
    clamp(generated.confidence - riskPenalty + esgBonus - riskLevelPenalty, 0, 100),
  );
}

function adjustRiskScoreBreakdown(
  generated: GeneratedRecommendationInput,
  riskScores: RiskScoreLike[],
): GeneratedRecommendationInput["scoreBreakdown"] {
  const matchingRiskScores = riskScores.filter((risk) =>
    generated.riskFactors.some(
      (factor) => factor.toLowerCase() === risk.name.toLowerCase(),
    ),
  );
  if (!matchingRiskScores.length) return generated.scoreBreakdown;

  const riskScore = Math.round(clamp(100 - average(matchingRiskScores.map((r) => r.score)), 0, 100));
  return generated.scoreBreakdown.map((item) =>
    item.dimension === "Risk" ? { ...item, score: riskScore } : item,
  );
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|and|of|for|in|to|with)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDuplicateTitle(title: string, existingTitles: string[]): boolean {
  const normalized = normalizeTitle(title);
  return existingTitles.some((existing) => {
    const other = normalizeTitle(existing);
    return other === normalized || other.includes(normalized) || normalized.includes(other);
  });
}

function buildPrompt(input: {
  request: GenerateRecommendationRequest;
  recommendations: Recommendation[];
  existingTitles: string[];
  signals: unknown[];
  riskScores: unknown[];
  esgSectors: unknown[];
  scenarioSnapshot: unknown;
  simulatedMarketContext: unknown;
  ragContext: string;
}) {
  const compactRecommendations = input.recommendations.slice(0, 8).map((rec) => ({
    title: rec.title,
    region: rec.region,
    sector: rec.sector,
    country: rec.country,
    capitalUsd: rec.capitalUsd,
    irrPct: rec.irrPct,
    riskLevel: rec.riskLevel,
    confidence: rec.confidence,
    status: rec.status,
    riskFactors: rec.riskFactors,
  }));
  const compactSignals = input.signals.slice(0, 12);
  const compactEsgSectors = input.esgSectors;
  const excludedTitles = input.existingTitles.slice(0, 20);

  return `Generate one new investment recommendation for the CLIENT Executive Command Center.

Return exactly one JSON object. Do not wrap it in markdown.

Required JSON fields:
{
  "title": string,
  "region": string,
  "sector": string,
  "country": string,
  "capitalUsd": number,
  "irrPct": number,
  "horizonYears": number,
  "riskLevel": "low" | "medium" | "high",
  "confidence": number,
  "tags": string[],
  "rationale": string,
  "scoreBreakdown": [
    ${SCORE_DIMENSIONS.map((dimension) => `{ "dimension": "${dimension}", "score": number }`).join(",\n    ")}
  ],
  "riskFactors": string[]
}

Rules:
- Use only the provided portfolio, RAG, and simulated online market context.
- Make the recommendation specific enough for an investment committee.
- Do not repeat or lightly reword any excluded recommendation title.
- Prefer a different country, region, capital amount, or thesis than recent recommendations unless the request explicitly forces it.
- Keep rationale under 80 words.
- Use capitalUsd within the requested range when provided.
- Use horizonYears from the request when provided, otherwise choose 3-8 years.
- Set confidence based on risk, ESG, IRR, liquidity, and portfolio fit.
- Include riskFactors that match the portfolio risk factor names where possible.
- Use 3-5 tags and 2-4 riskFactors only.

Request:
${safeJson(input.request)}

Excluded recommendation titles:
${safeJson(excludedTitles)}

Existing portfolio summary:
${safeJson(compactRecommendations)}

Latest signals:
${safeJson(compactSignals)}

Risk factor scores:
${safeJson(input.riskScores)}

ESG sector inputs:
${safeJson(compactEsgSectors)}

Scenario snapshot:
${safeJson(input.scenarioSnapshot)}

Simulated online market context:
${safeJson(input.simulatedMarketContext)}

Retrieved RAG context:
${input.ragContext}`;
}

export async function generateRecommendation(
  request: GenerateRecommendationRequest,
): Promise<Recommendation> {
  const [
    recommendationRows,
    signalRows,
    riskRows,
    esgRows,
    scenarioSnapshot,
    maxRankRow,
  ] = await Promise.all([
    prisma.recommendation.findMany({ orderBy: { rank: "asc" }, take: 20 }),
    prisma.signal.findMany({ orderBy: { timestamp: "desc" }, take: 50 }),
    prisma.riskFactorScore.findMany({ orderBy: { score: "desc" } }),
    prisma.esgSectorInput.findMany({ orderBy: { sector: "asc" } }),
    prisma.scenarioSnapshot.findUnique({ where: { key: "default" } }),
    prisma.recommendation.aggregate({ _max: { rank: true } }),
  ]);

  let ragResults: SearchResult[] = [];
  try {
    ragResults = await searchDocuments(buildRagQuery(request), 6);
  } catch (error) {
    console.warn("[generateRecommendation] RAG retrieval failed; continuing without retrieved chunks", error);
  }

  const mappedRecommendations = recommendationRows.map(mapRecommendationFromDb);
  const simulatedMarketContext = buildSimulatedMarketContext(
    request,
    recommendationRows.length,
  );
  const prompt = buildPrompt({
    request,
    recommendations: mappedRecommendations,
    existingTitles: mappedRecommendations.map((rec) => rec.title),
    signals: signalRows,
    riskScores: riskRows,
    esgSectors: esgRows,
    scenarioSnapshot,
    simulatedMarketContext,
    ragContext: summarizeRag(ragResults),
  });

  let generated: GeneratedRecommendationInput;
  let modelVersion = `ollama:${OLLAMA_MODEL}`;
  try {
    const llmResult = await generateRecommendationJson(prompt);
    modelVersion = llmResult.modelVersion;
    generated = validateGeneratedRecommendationJson(llmResult.output);
  } catch (error) {
    throw new MalformedLlmOutputError(
      error instanceof Error ? error.message : "LLM returned malformed recommendation JSON",
    );
  }

  if (isDuplicateTitle(generated.title, mappedRecommendations.map((rec) => rec.title))) {
    throw new MalformedLlmOutputError(
      `LLM repeated an existing recommendation title: ${generated.title}. Try a different filter or generate again.`,
    );
  }

  const matchedEsg = esgRows.find(
    (row) => row.sector.toLowerCase() === generated.sector.toLowerCase(),
  );
  const matchedEsgPayload = matchedEsg?.payload as { scores?: { overall?: number } } | undefined;
  const sectorEsgScore =
    typeof matchedEsgPayload?.scores?.overall === "number"
      ? matchedEsgPayload.scores.overall
      : null;
  const capitalUsd = request.capitalRangeUsd
    ? Math.round(clamp(generated.capitalUsd, request.capitalRangeUsd[0], request.capitalRangeUsd[1]))
    : generated.capitalUsd;
  // Step 5 — cross-check the LLM's self-reported confidence against the
  // risk-adjusted estimate. Large divergence means the model is out of step
  // with the risk engine, so flag it for a human instead of trusting it.
  const riskAdjustedConfidence = computeConfidence(generated, riskRows, sectorEsgScore);
  const confidenceDeviation = Math.abs(generated.confidence - riskAdjustedConfidence);
  const flaggedForReview = confidenceDeviation > CONFIDENCE_REVIEW_THRESHOLD;
  const confidence = riskAdjustedConfidence;
  const tags = flaggedForReview ? [...generated.tags, REVIEW_FLAG_TAG] : generated.tags;

  const ragNote =
    ragResults.length > 0
      ? `Generated with ${ragResults.length} retrieved RAG chunks and simulated market context.`
      : "Generated with simulated market context; RAG retrieval returned no chunks.";
  const confidenceNote = `LLM confidence ${generated.confidence} vs risk-adjusted ${riskAdjustedConfidence} (Δ${confidenceDeviation}).${
    flaggedForReview
      ? " Flagged for human review: confidence variance exceeds 15 points."
      : ""
  }`;

  const scoreBreakdown = adjustRiskScoreBreakdown(generated, riskRows);
  const rank = (maxRankRow._max.rank ?? recommendationRows.length) + 1;
  const id = `rec-ai-${randomUUID()}`;

  // TODO: Add auth and role checks before allowing generation in shared environments.
  const saved = await prisma.recommendation.create({
    data: {
      id,
      rank,
      title: generated.title,
      region: request.focusRegion ?? generated.region,
      sector: request.focusSector ?? generated.sector,
      country: request.focusCountry ?? generated.country,
      capitalUsd,
      irrPct: generated.irrPct,
      horizonYears: request.horizonYears ?? generated.horizonYears,
      riskLevel: generated.riskLevel,
      confidence,
      status: "pending_review",
      tags,
      rationale: generated.rationale,
      scoreBreakdown: scoreBreakdown as unknown as Prisma.InputJsonValue,
      modelVersion,
      generatedAt: new Date(),
      riskFactors: generated.riskFactors,
      dataSource: "live", // pipeline-produced, not a seeded fixture
      auditLogs: {
        create: {
          action: flaggedForReview ? "generated_flagged" : "generated",
          comment: `${ragNote} ${confidenceNote}`,
        },
      },
    },
  });

  return mapRecommendationFromDb(saved);
}
