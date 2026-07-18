import { GEMINI_MODEL } from "@/lib/llm/gemini";
import { OLLAMA_MODEL } from "@/lib/llm/ollama";
import type { SignalSeverity, SignalType } from "@/types";
import type { ArticleClassification, RawArticle } from "./types";

const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

const SIGNAL_TYPES: SignalType[] = ["risk", "opportunity", "policy", "deal", "market"];
const SEVERITIES: SignalSeverity[] = ["critical", "high", "medium", "low"];

export type ClassifierMethod = "llm" | "heuristic";

export interface ClassifyResult {
  method: ClassifierMethod;
  classifications: ArticleClassification[];
}

// ── Deterministic heuristics (fallback / no-LLM path) ────────────────────────

const RISK_WORDS = /\b(risk|crisis|default|slump|plunge|crash|sanction|conflict|war|fraud|probe|lawsuit|downgrade|recession|inflation|shortage|outage|strike|protest|ban|fine)\b/i;
const OPPORTUNITY_WORDS = /\b(surge|rally|record|growth|expansion|breakthrough|approval|launch|partnership|upgrade|boom|profit|beat|milestone)\b/i;
const DEAL_WORDS = /\b(acquisition|merger|acquire|buyout|stake|deal|ipo|raises?|funding|investment round|takeover)\b/i;
const POLICY_WORDS = /\b(regulation|policy|central bank|rate hike|rate cut|tariff|law|legislation|mandate|framework|treaty|subsidy|compliance|esg)\b/i;

function heuristicType(text: string): SignalType {
  if (DEAL_WORDS.test(text)) return "deal";
  if (POLICY_WORDS.test(text)) return "policy";
  if (RISK_WORDS.test(text)) return "risk";
  if (OPPORTUNITY_WORDS.test(text)) return "opportunity";
  return "market";
}

function heuristicSentiment(text: string): number {
  let score = 0;
  if (OPPORTUNITY_WORDS.test(text)) score += 0.5;
  if (DEAL_WORDS.test(text)) score += 0.2;
  if (RISK_WORDS.test(text)) score -= 0.6;
  return Math.max(-1, Math.min(1, Number(score.toFixed(2))));
}

function heuristicSeverity(type: SignalType, sentiment: number): SignalSeverity {
  if (type === "risk") return sentiment <= -0.6 ? "critical" : "high";
  if (type === "policy") return "medium";
  if (type === "opportunity" || type === "deal") return sentiment >= 0.5 ? "medium" : "low";
  return "low";
}

function heuristicClassify(article: RawArticle): ArticleClassification {
  const text = `${article.title} ${article.summary}`;
  const type = heuristicType(text);
  const sentiment = heuristicSentiment(text);
  return { type, severity: heuristicSeverity(type, sentiment), sentiment };
}

function heuristicClassifyAll(articles: RawArticle[]): ArticleClassification[] {
  return articles.map(heuristicClassify);
}

// ── Normalization ────────────────────────────────────────────────────────────

function coerceType(value: unknown): SignalType {
  return SIGNAL_TYPES.includes(value as SignalType) ? (value as SignalType) : "market";
}

function coerceSeverity(value: unknown): SignalSeverity {
  return SEVERITIES.includes(value as SignalSeverity) ? (value as SignalSeverity) : "low";
}

function coerceSentiment(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-1, Math.min(1, Number(n.toFixed(2))));
}

// ── LLM path (batched) ───────────────────────────────────────────────────────

function buildPrompt(articles: RawArticle[]): string {
  const list = articles
    .map((a, i) => `${i}. ${a.title}${a.summary && a.summary !== a.title ? ` — ${a.summary}` : ""}`)
    .join("\n");

  return `You are a financial market analyst. Classify each news headline for an investment "signal" feed.

Return a single JSON object of the exact form:
{ "results": [ { "i": number, "type": string, "severity": string, "sentiment": number }, ... ] }

Rules:
- One result per headline, "i" is the headline index.
- "type" is one of: "risk", "opportunity", "policy", "deal", "market".
- "severity" is one of: "critical", "high", "medium", "low".
- "sentiment" is a number from -1 (very negative) to 1 (very positive).
- Base the classification only on the headline text. Return results for every index.

Headlines:
${list}`;
}

interface RawResult {
  i?: number;
  type?: unknown;
  severity?: unknown;
  sentiment?: unknown;
}

function mapResults(articles: RawArticle[], results: RawResult[]): ArticleClassification[] {
  const byIndex = new Map<number, RawResult>();
  results.forEach((r, idx) => {
    const i = typeof r.i === "number" ? r.i : idx;
    byIndex.set(i, r);
  });

  return articles.map((article, i) => {
    const r = byIndex.get(i);
    if (!r) return heuristicClassify(article);
    return {
      type: coerceType(r.type),
      severity: coerceSeverity(r.severity),
      sentiment: coerceSentiment(r.sentiment),
    };
  });
}

function extractResults(output: unknown): RawResult[] {
  if (output && typeof output === "object" && Array.isArray((output as { results?: unknown }).results)) {
    return (output as { results: RawResult[] }).results;
  }
  if (Array.isArray(output)) return output as RawResult[];
  throw new Error("LLM classification response missing 'results' array");
}

async function classifyWithGemini(articles: RawArticle[]): Promise<ArticleClassification[]> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(articles) }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    if (!res.ok) throw new Error(`Gemini classify failed (${res.status})`);
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!text) throw new Error("Gemini returned empty classification");
    return mapResults(articles, extractResults(JSON.parse(text)));
  } finally {
    clearTimeout(timeout);
  }
}

async function classifyWithOllama(articles: RawArticle[]): Promise<ArticleClassification[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: "Return exactly one valid JSON object and no prose." },
          { role: "user", content: buildPrompt(articles) },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama classify failed (${res.status})`);
    const json = (await res.json()) as { message?: { content?: string } };
    const content = json.message?.content;
    if (!content) throw new Error("Ollama returned empty classification");
    return mapResults(articles, extractResults(JSON.parse(content)));
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Classifies a batch of articles into signal `type`/`severity`/`sentiment`.
 * Uses Gemini if `GEMINI_API_KEY` is set, else local Ollama. Falls back to
 * deterministic keyword heuristics if no provider is configured or the LLM call
 * fails, so ingestion never breaks.
 */
export async function classifyArticles(articles: RawArticle[]): Promise<ClassifyResult> {
  if (articles.length === 0) return { method: "heuristic", classifications: [] };

  const useGemini = Boolean(process.env.GEMINI_API_KEY);
  const useOllama = !useGemini && process.env.INGEST_DISABLE_OLLAMA !== "true";

  try {
    if (useGemini) {
      return { method: "llm", classifications: await classifyWithGemini(articles) };
    }
    if (useOllama) {
      return { method: "llm", classifications: await classifyWithOllama(articles) };
    }
  } catch (error) {
    console.warn("[ingest] LLM classification failed; using heuristics:", error);
  }

  return { method: "heuristic", classifications: heuristicClassifyAll(articles) };
}
