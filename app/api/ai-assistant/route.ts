import { NextRequest } from "next/server";
import { searchDocuments, formatContextBlock } from "@/lib/rag/search";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

const SYSTEM_PROMPT = `You are an investment analyst AI assistant for the CLIENT Executive Command Center.
You help portfolio executives understand AI-generated recommendations, risk factors, ESG scores, and scenario outcomes.
Always be concise, data-specific, and cite the numbers from the provided context.
Never give generic financial advice — always reference the specific portfolio data provided.
When retrieved documents are available, cite them by name (e.g. "According to the Solar Sector Outlook...").
Keep responses to 3-5 sentences unless the user explicitly asks for more detail.`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface OllamaChatChunk {
  message?: { content?: string };
  done?: boolean;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const context = String(body?.context ?? "");
  const snapshot = body?.portfolioSnapshot ?? {};
  const history: Array<{ role: string; text: string }> = Array.isArray(body?.messages)
    ? body.messages
    : [];

  const lastUserMessage = [...history].reverse().find((m) => m.role === "user");
  const userPrompt = String(lastUserMessage?.text ?? "Tell me about the current portfolio status.");

  // ── RAG: retrieve relevant document chunks ─────────────────────────────────
  let ragContextBlock = "";
  try {
    const ragQuery = `${context} ${userPrompt}`.trim();
    const ragResults = await searchDocuments(ragQuery, 4);
    ragContextBlock = formatContextBlock(ragResults);
  } catch (ragError) {
    // RAG is optional — if pgvector/Ollama embeddings fail, continue without it
    console.warn("[AI Assistant] RAG retrieval failed (continuing without):", ragError);
  }

  // ── Build context-aware user message ───────────────────────────────────────
  const contextParts: string[] = [];

  if (context) contextParts.push(`Page context: ${context}`);

  contextParts.push(
    `Portfolio snapshot: ${snapshot.recommendations ?? 0} recommendations total, ` +
    `${snapshot.approved ?? 0} approved, ${snapshot.pending ?? 0} pending review, ` +
    `${snapshot.underReview ?? 0} under review, ${snapshot.rejected ?? 0} rejected, ` +
    `${snapshot.unreadSignals ?? 0} unread signals.`,
  );

  if (ragContextBlock) {
    contextParts.push(`\nRelevant portfolio documents:\n${ragContextBlock}`);
  }

  const fullUserMessage = `${contextParts.join("\n")}\n\nUser question: ${userPrompt}`;

  // ── Build conversation history for Ollama ──────────────────────────────────
  const recentHistory = history.slice(-10);
  const messages: Message[] = [
    ...recentHistory.slice(0, -1).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.text,
    })),
    { role: "user" as const, content: fullUserMessage },
  ];

  // ── Call Ollama streaming endpoint ─────────────────────────────────────────
  let ollamaRes: Response;
  try {
    ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
        options: { temperature: 0.3, num_predict: 512 },
      }),
    });
  } catch {
    const fallback =
      "AI assistant is currently unavailable. Please ensure Ollama is running locally (`ollama serve`) and the model is pulled (`ollama pull llama3.2`).";
    return new Response(fallback, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  if (!ollamaRes.ok || !ollamaRes.body) {
    const err = await ollamaRes.text().catch(() => "Unknown error");
    return new Response(`Ollama error: ${err}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // ── Stream Ollama NDJSON → plain text tokens to client ────────────────────
  const encoder = new TextEncoder();
  const ollamaStream = ollamaRes.body;

  const readable = new ReadableStream({
    async start(controller) {
      const reader = ollamaStream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const chunk: OllamaChatChunk = JSON.parse(trimmed);
              const token = chunk.message?.content ?? "";
              if (token) controller.enqueue(encoder.encode(token));
              if (chunk.done) { controller.close(); return; }
            } catch { /* malformed line — skip */ }
          }
        }
      } catch { /* client disconnected */ }
      finally {
        reader.releaseLock();
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Ollama-Model": OLLAMA_MODEL,
      "X-RAG-Used": ragContextBlock ? "true" : "false",
    },
  });
}
