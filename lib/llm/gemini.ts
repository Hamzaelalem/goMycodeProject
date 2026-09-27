const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = (fenced?.[1] ?? text).trim();

  for (let i = 0; i < 2; i++) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (typeof parsed === "string") {
        candidate = parsed.trim();
        continue;
      }
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      break;
    }
  }

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `Gemini response did not contain a JSON object. Preview: ${candidate.slice(0, 240)}`,
    );
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (error) {
    throw new Error(
      `Could not parse Gemini JSON: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

const RECOMMENDATION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: [
    "title",
    "region",
    "sector",
    "country",
    "capitalUsd",
    "irrPct",
    "horizonYears",
    "riskLevel",
    "confidence",
    "tags",
    "rationale",
    "scoreBreakdown",
    "riskFactors",
  ],
  properties: {
    title: { type: "STRING" },
    region: { type: "STRING" },
    sector: { type: "STRING" },
    country: { type: "STRING" },
    capitalUsd: { type: "NUMBER" },
    irrPct: { type: "NUMBER" },
    horizonYears: { type: "NUMBER" },
    riskLevel: { type: "STRING", enum: ["low", "medium", "high"] },
    confidence: { type: "NUMBER" },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    rationale: { type: "STRING" },
    scoreBreakdown: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["dimension", "score"],
        properties: {
          dimension: {
            type: "STRING",
            enum: ["Market Size", "ESG", "IRR", "Risk", "Portfolio Fit", "Liquidity"],
          },
          score: { type: "NUMBER" },
        },
      },
    },
    riskFactors: { type: "ARRAY", items: { type: "STRING" } },
  },
};

const RETRYABLE_STATUS = new Set([500, 503]);
const GEMINI_TRANSIENT_RETRIES = 2;

/** Generate one investment recommendation as schema-constrained JSON. */
export async function generateJsonWithGemini(prompt: string): Promise<unknown> {
  return generateStructuredJsonWithGemini(prompt, RECOMMENDATION_RESPONSE_SCHEMA);
}

/**
 * Call Gemini with `responseMimeType: "application/json"` and a response schema,
 * returning the parsed JSON object. Throws on HTTP errors, empty or truncated output.
 */
export async function generateStructuredJsonWithGemini(
  prompt: string,
  responseSchema: Record<string, unknown>,
  options: { maxOutputTokens?: number; timeoutMs?: number } = {},
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const controller = new AbortController();
  const timeout = windowlessSetTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);

  try {
    const request = (): Promise<Response> => fetch(`${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "Return exactly one valid JSON object. Do not include markdown or prose.\n\n" +
                  prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: options.maxOutputTokens ?? 4096,
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingBudget: 0,
          },
          responseSchema,
        },
      }),
    });

    // "Model overloaded" (503) and transient 500s usually clear within seconds, so
    // retry them a couple of times inside the same timeout budget. Quota (429) is
    // not retried — waiting seconds cannot fix a daily limit.
    let res = await request();
    for (let attempt = 1; attempt <= GEMINI_TRANSIENT_RETRIES && RETRYABLE_STATUS.has(res.status); attempt++) {
      await res.body?.cancel();
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      res = await request();
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new Error(`Gemini generateContent failed (${res.status}): ${detail}`);
    }

    const json = (await res.json()) as GeminiGenerateContentResponse;
    const candidate = json.candidates?.[0];
    const content = candidate?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!content) {
      throw new Error(
        `Gemini returned an empty response${
          candidate?.finishReason ? ` (${candidate.finishReason})` : ""
        }`,
      );
    }

    if (candidate?.finishReason === "MAX_TOKENS") {
      throw new Error(`Gemini output was truncated. Preview: ${content.slice(0, 240)}`);
    }

    return extractJsonObject(content);
  } finally {
    clearTimeout(timeout);
  }
}

function windowlessSetTimeout(callback: () => void, ms: number): ReturnType<typeof setTimeout> {
  return setTimeout(callback, ms);
}
