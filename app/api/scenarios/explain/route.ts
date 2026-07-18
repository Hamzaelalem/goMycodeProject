import { NextRequest, NextResponse } from "next/server";

import { GEMINI_MODEL } from "@/lib/llm/gemini";
import { OLLAMA_MODEL } from "@/lib/llm/ollama";
import type { ScenarioCard, ScenarioInputs } from "@/types";
import type { SensitivityBar } from "@/lib/scenarios/compute";

export const runtime = "nodejs";

const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

const SYSTEM_PROMPT = `You are an investment scenario analyst for the CLIENT Executive Command Center.
Explain macro scenario outcomes concisely and specifically, always citing the numbers provided.
Never give generic advice. Respond in 3-4 sentences of plain prose (no markdown, no headings, no lists).`;

interface ExplainBody {
  inputs?: ScenarioInputs;
  cards?: ScenarioCard[];
  expectedIrr?: number;
  sensitivity?: SensitivityBar[];
  recommendation?: {
    title?: string;
    region?: string;
    sector?: string;
    irrPct?: number;
    riskLevel?: string;
  } | null;
}

function buildPrompt(body: ExplainBody): string {
  const { inputs, cards = [], expectedIrr, sensitivity = [], recommendation } = body;
  const parts: string[] = [];

  if (recommendation?.title) {
    parts.push(
      `Deal in context: "${recommendation.title}" (${recommendation.sector ?? "?"}, ${recommendation.region ?? "?"}), ` +
        `base IRR ${recommendation.irrPct ?? "?"}%, risk ${recommendation.riskLevel ?? "?"}.`,
    );
  } else {
    parts.push("No specific deal selected; explain at the portfolio level.");
  }

  if (inputs) {
    parts.push(
      `Macro inputs: oil $${inputs.oilPrice}/bbl, USD/local FX rate ${inputs.usdLocalRate} (100=parity), ` +
        `interest ${inputs.interestRate}%, inflation ${inputs.inflationRate}%.`,
    );
  }

  if (cards.length) {
    parts.push(
      "Scenarios: " +
        cards
          .map(
            (c) =>
              `${c.label} (${c.probabilityPct}% prob, IRR ${c.portfolioIrrPct}%, risk ${c.riskScore}, AUM $${c.projectedAumB}B)`,
          )
          .join("; ") +
        ".",
    );
  }

  if (typeof expectedIrr === "number") {
    parts.push(`Probability-weighted expected IRR: ${expectedIrr}%.`);
  }

  if (sensitivity.length) {
    parts.push(
      "IRR sensitivity (largest first): " +
        sensitivity.map((s) => `${s.label} ${s.swing >= 0 ? "+" : ""}${s.swing}pp`).join(", ") +
        ".",
    );
  }

  parts.push(
    "In 3-4 sentences: summarise what the scenario spread implies for the portfolio, name the macro factor that moves IRR most, and flag the key downside risk.",
  );

  return parts.join("\n");
}

function heuristicNarrative(body: ExplainBody): string {
  const { cards = [], expectedIrr, sensitivity = [] } = body;
  const base = cards.find((c) => c.id === "base");
  const stress = cards.find((c) => c.id === "stress");
  const topDriver = sensitivity[0];
  const sentences: string[] = [];

  if (base && stress) {
    sentences.push(
      `The base case projects a ${base.portfolioIrrPct}% IRR while the stress case falls to ${stress.portfolioIrrPct}% (risk ${stress.riskScore}), a spread of ${Math.round((base.portfolioIrrPct - stress.portfolioIrrPct) * 10) / 10}pp.`,
    );
  }
  if (typeof expectedIrr === "number") {
    sentences.push(`The probability-weighted expected IRR is ${expectedIrr}%.`);
  }
  if (topDriver) {
    sentences.push(
      `${topDriver.label.split(" ")[0]} is the dominant sensitivity, swinging IRR by ${topDriver.swing >= 0 ? "+" : ""}${topDriver.swing}pp across its range.`,
    );
  }
  sentences.push(
    "The primary downside is a simultaneous rate and inflation shock compressing valuations toward the stress scenario.",
  );
  return sentences.join(" ");
}

async function generateWithGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 400,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    if (!res.ok) throw new Error(`Gemini failed: ${res.status}`);
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch (error) {
    console.warn("[scenarios/explain] Gemini failed:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithOllama(prompt: string): Promise<string | null> {
  if (process.env.INGEST_DISABLE_OLLAMA === "true") return null;
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        options: { temperature: 0.3, num_predict: 400 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama failed: ${res.status}`);
    const json = (await res.json()) as { message?: { content?: string } };
    const text = json.message?.content?.trim();
    return text || null;
  } catch (error) {
    console.warn("[scenarios/explain] Ollama failed:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: ExplainBody;
  try {
    body = (await req.json()) as ExplainBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = buildPrompt(body);

  const gemini = await generateWithGemini(prompt);
  if (gemini) {
    return NextResponse.json({ narrative: gemini, model: `gemini:${GEMINI_MODEL}` });
  }

  const ollama = await generateWithOllama(prompt);
  if (ollama) {
    return NextResponse.json({ narrative: ollama, model: `ollama:${OLLAMA_MODEL}` });
  }

  return NextResponse.json({ narrative: heuristicNarrative(body), model: "heuristic" });
}
