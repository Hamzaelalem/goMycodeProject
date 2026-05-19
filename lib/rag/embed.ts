/**
 * Generates an embedding vector for a given text using the local
 * Ollama nomic-embed-text model (768 dimensions).
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";
const OLLAMA_EMBED_MODEL = "nomic-embed-text";
const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001";

interface OllamaEmbedResponse {
  embedding: number[];
}

interface GeminiEmbedResponse {
  embedding?: {
    values?: number[];
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getGeminiEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const res = await fetchWithTimeout(
    `${GEMINI_BASE_URL}/models/${GEMINI_EMBED_MODEL}:embedContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        output_dimensionality: 768,
        taskType: "RETRIEVAL_QUERY",
      }),
    },
    20_000,
  );

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini embed failed (${res.status}): ${err}`);
  }

  const json = (await res.json()) as GeminiEmbedResponse;
  const embedding = json.embedding?.values;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Gemini returned empty embedding");
  }

  return embedding;
}

async function getOllamaEmbedding(text: string): Promise<number[]> {
  const res = await fetchWithTimeout(
    `${OLLAMA_BASE_URL}/api/embeddings`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: text }),
    },
    12_000,
  );

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Ollama embed failed (${res.status}): ${err}`);
  }

  const json = (await res.json()) as OllamaEmbedResponse;

  if (!Array.isArray(json.embedding) || json.embedding.length === 0) {
    throw new Error("Ollama returned empty embedding");
  }

  return json.embedding;
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (process.env.GEMINI_API_KEY) {
    return getGeminiEmbedding(text);
  }
  return getOllamaEmbedding(text);
}

/** Formats a number[] as a pgvector literal: '[0.1,0.2,...]' */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
