import { NextRequest } from "next/server";
import { searchDocuments, formatContextBlock } from "@/lib/rag/search";
import { clientKey, rateLimit, tooManyRequestsResponse } from "@/lib/rateLimit";

// Paid LLM call per conversational turn — cap per caller (brief §6).
const HOUR_MS = 60 * 60 * 1000;
const ASSISTANT_LIMIT = Number(process.env.RATE_LIMIT_ASSISTANT_PER_HOUR ?? 30);

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

const GROQ_BASE_URL = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const PERSONAS: Record<string, string> = {
  standard: `You are a standard investment analyst AI assistant for the CLIENT Executive Command Center.
You help portfolio executives understand AI-generated recommendations, risk factors, ESG scores, and scenario outcomes.
Always be concise, data-specific, and cite the numbers from the provided context.
Never give generic financial advice — always reference the specific portfolio data provided.
When retrieved documents are available, cite them by name (e.g. "According to the Solar Sector Outlook...").
Keep responses to 3-5 sentences unless the user explicitly asks for more detail.`,

  risk: `You are a Risk Specialist AI assistant for the CLIENT Executive Command Center.
You help portfolio executives analyze potential downsides, credit volatility, market liquidity, and operational exposures.
Always prioritize capital preservation, risk-weight assessments, and stress metrics.
Critically analyze every recommendation from a risk-first perspective. Cite specific risk factor scores from the context.
Keep responses to 3-5 sentences.`,

  esg: `You are an ESG Advocate AI assistant for the CLIENT Executive Command Center.
You help portfolio executives evaluate Environmental, Social, and Governance compliance and taxonomy alignment.
Always prioritize sustainability parameters, greenhouse gas profiles, green offtake PPAs, and board governance.
Cite specific ESG sector ratings, KPI values, and overall grades from the context.
Keep responses to 3-5 sentences.`,

  conservative: `You are a Conservative Analyst AI assistant for the CLIENT Executive Command Center.
You help portfolio executives pursue secure, steady, and low-volatility investment paths.
Always prioritize defensive asset sectors (like Utilities or Water), secure IRR yields, and long-term liquidity.
Caution against speculative high-risk bets or high leverage options. Cite specific metrics.
Keep responses to 3-5 sentences.`
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface OllamaChatChunk {
  message?: { content?: string };
  done?: boolean;
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(clientKey(req, "assistant"), ASSISTANT_LIMIT, HOUR_MS);
  if (!limit.ok) return tooManyRequestsResponse(limit);

  const body = await req.json();

  const context = String(body?.context ?? "");
  const snapshot = body?.portfolioSnapshot ?? {};
  const history: Array<{ role: string; text: string }> = Array.isArray(body?.messages)
    ? body.messages
    : [];
  const modelType = String(body?.model ?? "gemini");
  const personaKey = String(body?.persona ?? "standard");
  const systemPrompt = PERSONAS[personaKey] || PERSONAS.standard;

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

  // Summary counts
  contextParts.push(
    `Portfolio overview: ${snapshot.recommendations ?? 0} recommendations total, ` +
    `${snapshot.approved ?? 0} approved, ${snapshot.pending ?? 0} pending review, ` +
    `${snapshot.underReview ?? 0} under review, ${snapshot.rejected ?? 0} rejected, ` +
    `${snapshot.unreadSignals ?? 0} unread signals.`,
  );

  // Detailed recommendation data
  const recDetails = snapshot.recommendationDetails;
  if (Array.isArray(recDetails) && recDetails.length > 0) {
    const recLines = recDetails.map(
      (r: { title: string; sector: string; region: string; country: string; status: string; irrPct: number; capitalUsd: number; riskLevel: string; confidence: number; rationale: string }, i: number) =>
        `  ${i + 1}. "${r.title}" | Sector: ${r.sector} | Region: ${r.region} (${r.country}) | Status: ${r.status} | IRR: ${r.irrPct}% | Capital: $${(r.capitalUsd / 1e6).toFixed(1)}M | Risk: ${r.riskLevel} | Confidence: ${r.confidence}% | Rationale: ${r.rationale}`,
    );
    contextParts.push(`\nAll recommendations:\n${recLines.join("\n")}`);
  }

  // Recent signals
  const sigDetails = snapshot.recentSignals;
  if (Array.isArray(sigDetails) && sigDetails.length > 0) {
    const sigLines = sigDetails.map(
      (s: { title: string; type: string; severity: string; sector: string; region: string; sentiment: number; timestamp: string }) =>
        `  - "${s.title}" | Type: ${s.type} | Severity: ${s.severity} | Sector: ${s.sector} | Region: ${s.region} | Sentiment: ${s.sentiment > 0 ? "+" : ""}${s.sentiment}`,
    );
    contextParts.push(`\nRecent signals (last 15):\n${sigLines.join("\n")}`);
  }

  // Risk factor scores
  const riskScores = snapshot.riskScores;
  if (Array.isArray(riskScores) && riskScores.length > 0) {
    const riskLines = riskScores.map(
      (r: { name: string; score: number; previousScore: number }) =>
        `  - ${r.name}: ${r.score}/100 (previous: ${r.previousScore}/100, ${r.score > r.previousScore ? "▲ worsening" : r.score < r.previousScore ? "▼ improving" : "→ stable"})`,
    );
    contextParts.push(`\nRisk factor scores:\n${riskLines.join("\n")}`);
  }

  if (ragContextBlock) {
    contextParts.push(`\nRelevant portfolio documents:\n${ragContextBlock}`);
  }

  const fullUserMessage = `${contextParts.join("\n")}\n\nUser question: ${userPrompt}`;

  // ── Route 1: Gemini Streaming (via SSE) ────────────────────────────────────
  if (modelType === "gemini" && process.env.GEMINI_API_KEY) {
    const apiKey = process.env.GEMINI_API_KEY;
    const geminiHistory = history.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    if (geminiHistory.length > 0 && geminiHistory[geminiHistory.length - 1].role === "user") {
      geminiHistory[geminiHistory.length - 1].parts[0].text = fullUserMessage;
    } else {
      geminiHistory.push({
        role: "user",
        parts: [{ text: fullUserMessage }]
      });
    }

    try {
      const geminiRes = await fetch(
        `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
        {
          method: "POST",
          // Key in a header, never the URL, so it can't leak into proxy/access logs.
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: geminiHistory,
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
            }
          })
        }
      );

      if (!geminiRes.ok || !geminiRes.body) {
        throw new Error(`Gemini stream call failed: ${geminiRes.statusText}`);
      }

      const encoder = new TextEncoder();
      const geminiStream = geminiRes.body;

      const readable = new ReadableStream({
        async start(controller) {
          const reader = geminiStream.getReader();
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
                if (trimmed.startsWith("data: ")) {
                  const jsonStr = trimmed.slice(6);
                  try {
                    const json = JSON.parse(jsonStr);
                    const token = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                    if (token) controller.enqueue(encoder.encode(token));
                  } catch { /* parse error — skip */ }
                }
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
          "X-AI-Model": `gemini:${GEMINI_MODEL}`,
          "X-RAG-Used": ragContextBlock ? "true" : "false",
        },
      });

    } catch (geminiError) {
      console.warn("[AI Assistant] Gemini stream failed, falling back to Ollama:", geminiError);
    }
  }

  // ── Route 1.5: Groq Streaming (OpenAI-compatible SSE) ──────────────────────
  if (modelType === "groq" && process.env.GROQ_API_KEY) {
    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      })),
    ];
    if (groqMessages.length > 1 && groqMessages[groqMessages.length - 1].role === "user") {
      groqMessages[groqMessages.length - 1].content = fullUserMessage;
    } else {
      groqMessages.push({ role: "user", content: fullUserMessage });
    }

    try {
      const groqRes = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.3,
          max_tokens: 1024,
          stream: true,
          messages: groqMessages,
        }),
      });

      if (!groqRes.ok || !groqRes.body) {
        throw new Error(`Groq stream call failed: ${groqRes.status} ${groqRes.statusText}`);
      }

      const encoder = new TextEncoder();
      const groqStream = groqRes.body;

      const readable = new ReadableStream({
        async start(controller) {
          const reader = groqStream.getReader();
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
                if (trimmed.startsWith("data: ")) {
                  const data = trimmed.slice(6);
                  if (data === "[DONE]") { controller.close(); return; }
                  try {
                    const json = JSON.parse(data);
                    const token = json.choices?.[0]?.delta?.content ?? "";
                    if (token) controller.enqueue(encoder.encode(token));
                  } catch { /* parse error — skip */ }
                }
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
          "X-AI-Model": `groq:${GROQ_MODEL}`,
          "X-RAG-Used": ragContextBlock ? "true" : "false",
        },
      });
    } catch (groqError) {
      console.warn("[AI Assistant] Groq stream failed, falling back to Ollama:", groqError);
    }
  }

  // ── Route 2: Ollama Local Streaming ────────────────────────────────────────
  const recentHistory = history.slice(-10);
  const messages: Message[] = [
    ...recentHistory.slice(0, -1).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.text,
    })),
    { role: "user" as const, content: fullUserMessage },
  ];

  let ollamaRes: Response;
  try {
    ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        options: { temperature: 0.3, num_predict: 512 },
      }),
    });
  } catch {
    const fallback =
      "AI assistant is currently unavailable. Please ensure Ollama is running locally (`ollama serve`) and the model is pulled (`ollama pull llama3.2`) or configure your Gemini API Key in .env.local.";
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
      "X-AI-Model": `ollama:${OLLAMA_MODEL}`,
      "X-RAG-Used": ragContextBlock ? "true" : "false",
    },
  });
}
