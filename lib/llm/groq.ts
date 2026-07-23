const GROQ_BASE_URL = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
export const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS ?? 45_000);

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Groq response did not contain a JSON object");
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (error) {
    throw new Error(
      `Could not parse Groq JSON: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

/**
 * Groq inference via its OpenAI-compatible Chat Completions API. Very fast
 * (LPU hardware) with JSON mode. Model set by `GROQ_MODEL`.
 */
export async function generateJsonWithGroq(prompt: string): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.25,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an investment analyst. Return exactly one valid JSON object and no prose.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new Error(`Groq chat failed (${res.status}): ${detail}`);
    }

    const json = (await res.json()) as GroqChatResponse;
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Groq returned an empty response");

    return extractJsonObject(content);
  } finally {
    clearTimeout(timeout);
  }
}
