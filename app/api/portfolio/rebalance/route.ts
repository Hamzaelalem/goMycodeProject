import { NextRequest, NextResponse } from "next/server";

import { fetchGoogleNews } from "@/lib/ingest/googleNews";
import { GEMINI_MODEL, generateStructuredJsonWithGemini } from "@/lib/llm/gemini";
import { generateJsonWithGroq, GROQ_MODEL } from "@/lib/llm/groq";
import { clientKey, rateLimit, tooManyRequestsResponse } from "@/lib/rateLimit";
import {
  applyGuardrails,
  fallbackDirective,
  type AssetRebalance,
  type Headline,
  MAX_ADJUSTMENT_PCT,
  newsQueryFor,
  portfolioWeights,
  type RebalanceResponse,
  summarizeProviderError,
} from "@/lib/sentinel/rebalance";
import { listHoldings } from "@/lib/portfolio/repository";
import { listScans, saveScan } from "@/lib/sentinel/scans";
import { portfolioHoldings as demoHoldings } from "@/mock-data/portfolio";
import type { PortfolioHolding } from "@/types";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One Gemini call per scan — cap per caller to protect the LLM budget (brief §6).
const HOUR_MS = 60 * 60 * 1000;
const REBALANCE_LIMIT = Number(process.env.RATE_LIMIT_REBALANCE_PER_HOUR ?? 20);
const HEADLINES_PER_ASSET = 3;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: ["directives"],
  properties: {
    directives: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: [
          "holdingId",
          "action",
          "targetAdjustmentPct",
          "confidence",
          "riskScore",
          "rationale",
          "keyCatalyst",
        ],
        properties: {
          holdingId: { type: "STRING" },
          action: { type: "STRING", enum: ["BUY", "SELL", "HOLD"] },
          targetAdjustmentPct: { type: "NUMBER" },
          confidence: { type: "NUMBER" },
          riskScore: { type: "NUMBER" },
          rationale: { type: "STRING" },
          keyCatalyst: { type: "STRING" },
        },
      },
    },
  },
};

type RawDirective = {
  holdingId?: unknown;
  action?: unknown;
  targetAdjustmentPct?: unknown;
  confidence?: unknown;
  riskScore?: unknown;
  rationale?: unknown;
  keyCatalyst?: unknown;
};

/** Top headlines for every holding, fetched in parallel; a failed feed yields []. */
async function fetchHeadlines(holdings: PortfolioHolding[]): Promise<Map<string, Headline[]>> {
  const results = await Promise.all(
    holdings.map(async (holding) => {
      try {
        const articles = await fetchGoogleNews(newsQueryFor(holding), HEADLINES_PER_ASSET * 2);
        const seen = new Set<string>();
        const headlines = articles
          .filter((a) => !seen.has(a.title) && seen.add(a.title))
          .slice(0, HEADLINES_PER_ASSET)
          .map((a) => ({ title: a.title, publisher: a.publisher, link: a.link, publishedAt: a.publishedAt }));
        return [holding.id, headlines] as const;
      } catch (error) {
        console.warn(`[rebalance] news fetch failed for ${holding.id}:`, error);
        return [holding.id, [] as Headline[]] as const;
      }
    }),
  );
  return new Map(results);
}

function buildPrompt(holdings: PortfolioHolding[], weights: Record<string, number>, news: Map<string, Headline[]>): string {
  const assets = holdings.map((h) => ({
    holdingId: h.id,
    name: h.name,
    sector: h.sector,
    region: h.region,
    currentWeightPct: weights[h.id],
    expectedIrrPct: h.irrPct,
    currentRiskScore: h.riskScore,
    headlines: (news.get(h.id) ?? []).map((n) => `${n.title.slice(0, 140)} (${n.publishedAt.slice(0, 10)})`),
  }));

  return `You are the Adaptive Portfolio Sentinel, a risk-aware rebalancing analyst for a private-markets portfolio.
For EVERY holding below, return exactly one directive based ONLY on its live headlines and figures.

Rules:
- action: "BUY" (raise weight), "SELL" (cut weight) or "HOLD".
- targetAdjustmentPct: absolute change in portfolio weight, 0 to ${MAX_ADJUSTMENT_PCT} percentage points (0 for HOLD).
- confidence: 1-100, how strongly the headlines support the action. Use HOLD with low confidence when headlines are generic, stale or unrelated.
- riskScore: 1-100 updated risk for the holding given the news.
- rationale: one sentence (max 30 words) citing the headline evidence.
- keyCatalyst: the single headline (verbatim) that most drives the directive, or "None" if no headline is relevant.
- Never invent news that is not in the headlines.

Holdings (JSON):
${JSON.stringify(assets)}`;
}

/** Groq has JSON mode but no schema enforcement, so spell the shape out. */
const GROQ_SHAPE_HINT = `
Return JSON exactly in this shape, one entry per holding:
{"directives":[{"holdingId":"...","action":"BUY|SELL|HOLD","targetAdjustmentPct":0,"confidence":1,"riskScore":1,"rationale":"...","keyCatalyst":"..."}]}`;

/**
 * Primary: Gemini with a response schema. Secondary: Groq JSON mode, used only
 * when Gemini fails. Throws when both fail so the caller serves the fallback.
 */
async function generateDirectives(
  prompt: string,
): Promise<{ output: { directives?: RawDirective[] }; model: string; providerNote?: string }> {
  let geminiError: unknown = new Error("GEMINI_API_KEY is not set");
  if (process.env.GEMINI_API_KEY) {
    try {
      const output = await generateStructuredJsonWithGemini(prompt, RESPONSE_SCHEMA, {
        maxOutputTokens: 8192,
        timeoutMs: 60_000,
      });
      return { output: output as { directives?: RawDirective[] }, model: `gemini:${GEMINI_MODEL}` };
    } catch (error) {
      geminiError = error;
      console.warn("[rebalance] Gemini failed:", error instanceof Error ? error.message.slice(0, 500) : error);
    }
  }

  if (!process.env.GROQ_API_KEY) throw geminiError;
  try {
    // ~2k prompt + 3k output stays under Groq's free-tier 8k tokens/minute.
    const output = await generateJsonWithGroq(prompt + GROQ_SHAPE_HINT, { maxTokens: 3000 });
    return {
      output: output as { directives?: RawDirective[] },
      model: `groq:${GROQ_MODEL}`,
      providerNote: `Gemini unavailable (${summarizeProviderError(geminiError)}) — served by Groq.`,
    };
  } catch (groqError) {
    console.warn("[rebalance] Groq failed:", groqError instanceof Error ? groqError.message.slice(0, 500) : groqError);
    throw new Error(
      `Gemini: ${summarizeProviderError(geminiError)}; Groq: ${summarizeProviderError(groqError)}`,
    );
  }
}

function buildAssets(
  holdings: PortfolioHolding[],
  weights: Record<string, number>,
  news: Map<string, Headline[]>,
  directiveFor: (holding: PortfolioHolding, headlines: Headline[], weight: number) => AssetRebalance["directive"],
): AssetRebalance[] {
  return holdings.map((holding) => {
    const headlines = news.get(holding.id) ?? [];
    const currentWeightPct = weights[holding.id] ?? 0;
    return {
      holdingId: holding.id,
      name: holding.name,
      sector: holding.sector,
      region: holding.region,
      currentWeightPct,
      newsQuery: newsQueryFor(holding),
      headlines,
      directive: directiveFor(holding, headlines, currentWeightPct),
    };
  });
}

function countHeadlines(news: Map<string, Headline[]>): number {
  let count = 0;
  for (const list of news.values()) count += list.length;
  return count;
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(clientKey(req, "rebalance"), REBALANCE_LIMIT, HOUR_MS);
  if (!limit.ok) return tooManyRequestsResponse(limit);

  // Saved client portfolio; demo holdings only if the database is unreachable.
  let holdings: PortfolioHolding[];
  let portfolioSource: RebalanceResponse["portfolioSource"] = "database";
  try {
    holdings = await listHoldings();
  } catch (error) {
    console.warn("[rebalance] portfolio DB unavailable; using demo holdings:", summarizeProviderError(error));
    holdings = demoHoldings;
    portfolioSource = "demo";
  }
  if (holdings.length === 0) {
    return NextResponse.json(
      { error: "Your portfolio is empty — add holdings on the My Portfolio page first." },
      { status: 400 },
    );
  }
  const weights = portfolioWeights(holdings);
  let news = new Map<string, Headline[]>();

  try {
    news = await fetchHeadlines(holdings);
    const headlineCount = countHeadlines(news);
    if (headlineCount === 0) throw new Error("No live headlines could be retrieved");

    const { output, model, providerNote } = await generateDirectives(buildPrompt(holdings, weights, news));

    const byId = new Map((output.directives ?? []).map((d) => [String(d.holdingId), d]));
    if (byId.size === 0) throw new Error(`${model} returned no directives`);

    const assets = buildAssets(holdings, weights, news, (holding, headlines, weight) => {
      const raw = byId.get(holding.id);
      if (!raw) {
        const fallback = fallbackDirective(holding, headlines, weight);
        return { ...fallback, guardrails: ["Model returned no directive — deterministic fallback used.", ...fallback.guardrails] };
      }
      return applyGuardrails(raw, { currentWeightPct: weight, headlineCount: headlines.length });
    });

    const body: RebalanceResponse = {
      mode: "live-ai",
      portfolioSource,
      model,
      providerNote,
      generatedAt: new Date().toISOString(),
      headlineCount,
      assets,
    };
    return NextResponse.json(await persist(body));
  } catch (error) {
    // Deterministic fallback: never fail the UI (LLM rate limit, outage, bad JSON, offline RSS).
    const reason = summarizeProviderError(error);
    console.warn("[POST /api/portfolio/rebalance] falling back to deterministic directives:", error);

    const body: RebalanceResponse = {
      mode: "fallback",
      portfolioSource,
      model: "deterministic:keyword-sentiment-v1",
      generatedAt: new Date().toISOString(),
      fallbackReason: reason,
      headlineCount: countHeadlines(news),
      assets: buildAssets(holdings, weights, news, fallbackDirective),
    };
    return NextResponse.json(await persist(body));
  }
}

/** Save the scan for history/sign-off; a DB failure must not lose the live result. */
async function persist(body: RebalanceResponse): Promise<RebalanceResponse> {
  try {
    return await saveScan(body);
  } catch (error) {
    console.warn("[rebalance] could not save scan; returning it unsaved:", summarizeProviderError(error));
    return body;
  }
}

/** Recent scans for the history list. */
export async function GET() {
  try {
    return NextResponse.json({ scans: await listScans() });
  } catch (error) {
    console.error("[GET /api/portfolio/rebalance]", error);
    return NextResponse.json({ error: "Failed to load scan history" }, { status: 500 });
  }
}
