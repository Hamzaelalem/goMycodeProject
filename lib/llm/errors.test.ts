import { describe, expect, it } from "vitest";

import { LlmProviderError, summarizeProviderError } from "./errors";

const geminiQuota = new Error(
  'Gemini generateContent failed (429): { "error": { "code": 429, "message": "You exceeded your current quota", "status": "RESOURCE_EXHAUSTED" } }',
);

describe("LlmProviderError", () => {
  it("turns a raw Gemini quota error into a short actionable message", () => {
    const error = new LlmProviderError("gemini", geminiQuota);
    expect(error.quota).toBe(true);
    expect(error.message).toMatch(/^Gemini is unavailable: quota \/ rate limit exceeded \(429\)\./);
    expect(error.message).toMatch(/Ollama/);
    expect(error.message).not.toMatch(/RESOURCE_EXHAUSTED|\{/);
  });

  it("summarises other failures without quota hints", () => {
    const error = new LlmProviderError("ollama", new Error("This operation was aborted"));
    expect(error.quota).toBe(false);
    expect(error.message).toBe("Ollama is unavailable: timed out.");
  });
});

describe("summarizeProviderError", () => {
  it("maps HTTP statuses and trims long messages", () => {
    expect(summarizeProviderError(new Error("Groq chat failed (404): {...}"))).toBe("HTTP 404");
    expect(summarizeProviderError(new Error("x".repeat(500)))).toHaveLength(160);
  });
});
