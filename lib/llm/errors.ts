/** Short, UI-safe description of an LLM provider failure (no raw JSON bodies). */
export function summarizeProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const status = message.match(/\((\d{3})\)/)?.[1];
  if (status === "429") return "quota / rate limit exceeded (429)";
  if (status === "503") return "model overloaded, try again in a minute (503)";
  if (status) return `HTTP ${status}`;
  if (/abort/i.test(message)) return "timed out";
  return message.replace(/\s+/g, " ").slice(0, 160);
}

export function isQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\(429\)|RESOURCE_EXHAUSTED|rate limit/i.test(message);
}

const PROVIDER_LABELS: Record<string, string> = { gemini: "Gemini", groq: "Groq", ollama: "Ollama" };

/** An LLM provider could not serve the request (quota, outage, missing key, timeout). */
export class LlmProviderError extends Error {
  readonly quota: boolean;

  constructor(provider: string, cause: unknown) {
    const label = PROVIDER_LABELS[provider] ?? provider;
    const quota = isQuotaError(cause);
    const hint =
      quota && provider === "gemini"
        ? " The Gemini free tier allows a limited number of requests per day per Google Cloud project — try again later, use a key from another project, or generate with Ollama."
        : "";
    super(`${label} is unavailable: ${summarizeProviderError(cause)}.${hint}`);
    this.name = "LlmProviderError";
    this.quota = quota;
  }
}
