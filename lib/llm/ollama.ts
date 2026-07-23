const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";
// Local inference can be slow (cold model load + CPU offload); bound it so a
// hung request fails instead of blocking the route forever. Configurable.
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 180_000);
// Small models (1b, 3b) need more tokens to produce valid JSON with many
// required fields. 768 was too tight and caused truncated output. 2048 gives
// comfortable headroom while still bounding runaway generation.
const OLLAMA_NUM_PREDICT = Number(process.env.OLLAMA_NUM_PREDICT ?? 2048);
// Maximum number of retries when the model produces malformed JSON.
const MAX_RETRIES = 2;

type OllamaGenerateResponse = {
  response?: string;
};

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

function extractJsonObject(text: string): unknown {
  // Strip fenced code blocks if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = (fenced?.[1] ?? text).trim();

  // Try direct parse first (handles clean JSON output)
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
    // If the model returned a stringified JSON inside JSON, unwrap once
    if (typeof parsed === "string") {
      candidate = parsed.trim();
    }
  } catch {
    // Not valid JSON on its own — fall through to bracket extraction
  }

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `LLM response did not contain a JSON object. Raw preview: ${candidate.slice(0, 300)}`,
    );
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (error) {
    throw new Error(
      `Could not parse LLM JSON: ${error instanceof Error ? error.message : "unknown error"}. Raw preview: ${candidate.slice(start, Math.min(start + 300, end + 1))}`,
    );
  }
}

async function callOllamaChat(
  prompt: string,
  systemPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        // Keep the model resident so the next call skips the cold load.
        keep_alive: "30m",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        options: { temperature: 0.25, num_predict: OLLAMA_NUM_PREDICT },
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Ollama did not respond within ${Math.round(OLLAMA_TIMEOUT_MS / 1000)}s (model may be cold-loading or too slow on this machine).`,
      );
    }
    throw new Error(
      `Ollama request failed: ${error instanceof Error ? error.message : "unknown error"}. ` +
        `Is 'ollama serve' running on ${OLLAMA_BASE_URL}?`,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Ollama chat failed (${res.status}): ${detail}`);
  }

  const json = (await res.json()) as OllamaChatResponse | OllamaGenerateResponse;
  const content =
    "message" in json ? json.message?.content : "response" in json ? json.response : undefined;

  if (!content) {
    throw new Error("Ollama returned an empty response");
  }

  return content;
}

export async function generateJsonWithOllama(prompt: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  const systemPrompt =
    "You are an investment analyst. Return exactly one valid JSON object. " +
    "Do not add any text, explanation, or markdown — output ONLY the JSON object.";

  let lastError: Error | null = null;
  try {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const retryNote =
          attempt > 0
            ? `\n\nIMPORTANT: Your previous response was NOT valid JSON. You MUST return ONLY a valid JSON object with ALL required fields. No extra text.`
            : "";
        const content = await callOllamaChat(
          prompt + retryNote,
          systemPrompt,
          controller.signal,
        );
        return extractJsonObject(content);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `[Ollama] JSON generation attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`,
          lastError.message,
        );
        if (attempt === MAX_RETRIES) break;
        // Brief pause before retry to avoid hammering
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  throw lastError ?? new Error("Ollama JSON generation failed after retries");
}
