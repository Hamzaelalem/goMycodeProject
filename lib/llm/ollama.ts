const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

type OllamaGenerateResponse = {
  response?: string;
};

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM response did not contain a JSON object");
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (error) {
    throw new Error(
      `Could not parse LLM JSON: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

export async function generateJsonWithOllama(prompt: string): Promise<unknown> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      messages: [
        {
          role: "system",
          content:
            "You are an investment analyst. Return exactly one valid JSON object and no prose.",
        },
        { role: "user", content: prompt },
      ],
      options: { temperature: 0.25, num_predict: 1200 },
    }),
  });

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

  return extractJsonObject(content);
}

