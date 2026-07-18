const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

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

export async function generateJsonWithGemini(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const controller = new AbortController();
  const timeout = windowlessSetTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch(`${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent`, {
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
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingBudget: 0,
          },
          responseSchema: {
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
          },
        },
      }),
    });

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
