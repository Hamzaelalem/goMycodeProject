# API Reference

All routes are Next.js App Router handlers under `app/api/**/route.ts`. Domain reads are consumed by `useGlobalStore.bootstrapData()`; mutations by `lib/api/mutations.ts` and store actions. Row→domain mapping via `lib/mappers/*`.

**Authentication:** a shared-password gate in `proxy.ts` (Next.js 16's renamed `middleware.ts`) fronts the entire app. Every route below requires a valid signed session cookie (`dl_session`) except `POST /api/auth/login` and `POST /api/auth/logout`. Unauthenticated API calls return `401 { error:"Unauthorized" }`; unauthenticated page loads redirect to `/login`. See the **Auth** section below and `lib/auth/session.ts`.

Legend: **params** = query string; **body** = JSON. Success/error status codes noted.

---

## Recommendations

### `GET /api/recommendations`
- **Params:** `sector?`, `status?` (must be in `{approved, under_review, pending_review, rejected}`), `minConfidence?` (int → `confidence >= n`).
- **Logic:** `prisma.recommendation.findMany({ where, orderBy: { rank: "asc" } })`.
- **Response:** `200` `Recommendation[]` (mapped) · `500 { error }`.
- **Consumers:** `bootstrapData`, `useData.useRecommendations`.

### `GET /api/recommendations/[id]`
- **Params:** `id` (from `await context.params`).
- **Logic:** `findUnique({ where: { id }, include: { auditLogs: { orderBy: { at: "asc" } } } })`.
- **Response:** `200` `RecommendationDetail` = mapped `Recommendation` **plus** `auditLogs: { id, action, comment, at }[]` (the durable `RecommendationAuditLog` trail — includes the Step-5 confidence reconciliation on the `generated`/`generated_flagged` entry) · `404 { error:"Not found" }` · `500 { error }`.
- **Consumers:** `fetchRecommendationDetailApi` ← RecommendationDrawer (audit trail + flag surfacing).

### `PATCH /api/recommendations/[id]`
- **Body:** `{ status?: string, comment?: string }`. `status` must be in the valid set (else `400 { error:"Invalid status" }`).
- **Logic:** `recommendation.update({ where:{id}, data:{status} })` → `recommendationAuditLog.create({ recommendationId:id, action:status, comment })`.
- **Response:** `200` updated `Recommendation` · `500 { error }`.
- **Consumers:** `updateRecommendationStatusApi` ← `updateRecommendationStatus` (store).

### `POST /api/recommendations/generate`
- **Body:** `GenerateRecommendationRequest` = `{ focusSector?, focusRegion?, focusCountry?, capitalRangeUsd?:[number,number], riskAppetite?:RiskLevel, horizonYears? }` — validated by `parseGenerateRecommendationRequest`.
- **Logic:** `generateRecommendation(request)` (LLM + RAG + DB context; persists a new recommendation + `auditLog action:"generated"`). See [ai-subsystem.md](ai-subsystem.md).
- **Response:** `201 { recommendation }` · `400 { error }` (validation) · `502 { error, detail }` (malformed LLM output) · `500 { error }`.
- **Consumers:** `generateRecommendationApi` ← recs VM.
- ⚠️ **No auth** — persists to DB (`// TODO: Add auth and role checks`).

---

## Signals

### `GET /api/signals`
- **Params:** `type?`, `severity?`, `sector?`, `country?`, `after?` (ISO → `timestamp > after`), `limit?` (default 50, cap 200).
- **Logic:** `findMany({ where, orderBy:{ timestamp: after ? "asc" : "desc" }, take: limit })`.
- **Response:** `200` `Signal[]` (mapped) · `500 { error }`.
- **Consumers:** `bootstrapData` (`?limit=200`), `useSignalStream` (`?after=…&limit=15`), `useData.useSignals`.

### `POST /api/signals`
- **Body (`parseSignalCreateBody`):** required strings `id, title, body, type, severity, source, country, region, sector`; optional `sentiment` (finite, def 0), `reach` (int, def 0), `timestamp` (ISO, invalid→now), `riskFactor` (string|null), `workflowItemId` (string|null), `url` (string|null), `publisher` (string|null). Missing required → `400 { error:"Invalid signal payload" }`.
- **Logic:** `signal.create({ data })`.
- **Response:** `201` `Signal` (mapped) · `500 { error }`.

### `GET /api/signals/stream` — **SSE** (`text/event-stream`)
- **Runtime:** `nodejs`, `dynamic = "force-dynamic"`. Snapshots `cursor = now` on connect.
- **Logic:** every 5s, `signal.findMany({ where:{ timestamp:{ gt: cursor } }, orderBy:{ timestamp:"asc" }, take:50 })`; emits each new row as `event: signal` (mapped), advances `cursor`; sends a `: heartbeat` comment when idle. Emits `event: ready` on connect. Cleans up the interval on client `abort`/`cancel`.
- **Response:** SSE stream (`Cache-Control: no-cache, no-transform`). Real-time push of signals created via `POST /api/signals` or the news ingester.
- **Consumers:** `useSignalStream` (primary transport).

### `POST /api/signals/ingest` — news ingestion
- **Runtime:** `nodejs`, `dynamic`. Optional `?limitPerQuery=` (1–20).
- **Auth:** open unless `INGEST_TOKEN` is set, then requires `x-ingest-token` header or `?token=` (→ `401`).
- **Mode gate:** returns `409 { ok:false, error:"Fetching is turned off" }` when the runtime mode is `off`.
- **Logic:** `runNewsIngest()` — fetches Google News RSS per watchlist query, classifies (LLM/heuristic), inserts new `Signal` rows (`timestamp = now` so SSE broadcasts them). Idempotent via a stable id from the article link. See [ai-subsystem.md](ai-subsystem.md#news-ingestion).
- **Response:** `200` `IngestSummary { ok, fetched, inserted, duplicates, queries, classifier, startedAt, finishedAt }` · `502` on failure.
- **Consumers:** `ingestNewsApi` ← Live Feed "Fetch latest news" button; the scheduler (when mode `auto`).

### `GET /api/signals/ingest` — ingestion status
- **Response:** `200 { running, mode: "auto"|"manual"|"off", lastRun: IngestSummary | null }`.

### `PATCH /api/signals/ingest` — set fetch mode
- **Auth:** same optional `INGEST_TOKEN`.
- **Body:** `{ mode: "auto" | "manual" | "off" }` (else `400`).
- **Effect:** `auto` = scheduled (6h) + on-demand; `manual` = on-demand only (scheduler paused); `off` = nothing fetches (POST blocked). Runtime, in-memory (per server process); initial value from `INGEST_ENABLED`.
- **Response:** `200 { mode }`.
- **Consumers:** `setIngestModeApi`/`getIngestStatusApi` ← Live Feed Auto/On-demand/Off control.

---

## Risk

### `GET /api/risk`
- **Logic:** `riskFactorScore.findMany({ orderBy:{ score:"desc" } })`.
- **Response:** `200` `RiskFactorScore[]` (mapped) · `500 { error }`.
- **Consumers:** `bootstrapData`, `useData.useRiskScores`.

---

## ESG

### `GET /api/esg`
- **Params:** `sector?`.
- **Logic:** `esgSectorInput.findMany({ where, orderBy:{ sector:"asc" } })`.
- **Response:** `200` `EsgSectorInputs[]` (mapped from `payload` Json) · `500 { error }`.

### `PATCH /api/esg`
- **Body:** `{ sector: string, payload: { kpis, scores } }` (both required, `payload` object → else `400`).
- **Logic:** `esgSectorInput.update({ where:{ sector }, data:{ payload } })`.
- **Response:** `200` `EsgSectorInputs` · `500 { error }`.
- **Consumers:** `updateEsgSectorApi` ← esg VM.

---

## Scenarios

### `GET /api/scenarios`
- **Params:** `all=true?`.
- **Logic:** `all` → `scenarioSnapshot.findMany({ orderBy:{ updatedAt:"desc" } })`; else `findUnique({ where:{ key:"default" } })`.
- **Response:** `200` single `{key, defaultInputs, scenarioCards, irrProjection}` or array · `404 { error:"No scenario snapshot" }` (single) · `500 { error }`.

### `POST /api/scenarios`
- **Body:** `{ key?, defaultInputs, scenarioCards, irrProjection }` (all three payload parts required → else `400`). `key` defaults to `"default"`. Per-recommendation sandboxes use a scoped `key` of `"<recommendationId>::<name>"`; global ones use a plain `name`.
- **Logic:** `scenarioSnapshot.upsert({ where:{ key }, create, update })` (JSON columns).
- **Response:** `201` snapshot object · `500 { error }`.
- **Consumers:** `saveScenarioBundleApi` ← `saveScenarioAction` (store).

### `POST /api/scenarios/compute`
- **Runtime:** `nodejs`. The Scenario Modelling Engine's server-side computation backend.
- **Body:** `{ inputs: {oilPrice,usdLocalRate,interestRate,inflationRate}, recommendationId? }`. Also accepts legacy `fxDeltaPct` (auto-converted to `usdLocalRate` as `fxDeltaPct + 100`). Invalid/missing numeric inputs → `400`.
- **Logic:** base anchor = `baseFromPortfolio(mockPortfolio)`; if `recommendationId` resolves, `baseFromRecommendation(rec, portfolioBase)` overrides IRR/risk. Returns `computeScenarioBundle(inputs, base)`.
- **Response:** `200 { base, cards, projection, expectedIrr, sensitivity, monteCarlo }` · `400 { error }`.
- **Consumers:** `computeScenariosApi` ← `useScenariosViewModel` (source of truth; client `computeScenarioBundle` is the instant fallback).

### `POST /api/scenarios/explain`
- **Runtime:** `nodejs`.
- **Body:** `{ inputs, cards, expectedIrr, sensitivity, recommendation? }` (all optional; grounds the prompt).
- **Logic:** builds a grounded prompt → Gemini `generateContent` (if `GEMINI_API_KEY`) → Ollama `/api/chat` fallback (skipped when `INGEST_DISABLE_OLLAMA=true`) → deterministic heuristic narrative. Never throws for content — always returns a narrative.
- **Response:** `200 { narrative, model }` where `model` is `gemini:<m>` / `ollama:<m>` / `heuristic` · `400 { error:"Invalid JSON body" }`.
- **Consumers:** `explainScenarioApi` ← `useScenariosViewModel.handleExplain`.

---

## Workflow

### `GET /api/workflow`
- **Params:** `status?` (validated against status set).
- **Logic:** `Promise.all([ recommendation.findMany({ where, orderBy:{ updatedAt:"desc" } }), workflowLogEntry.findMany({ orderBy:{ timestamp:"asc" } }) ])`.
- **Response:** `200 { recommendations: Recommendation[], workflowLogs: WorkflowLogEntry[] }` · `500 { error }`.
- **Note:** `bootstrapData` reads only `workflowLogs` from this response.

---

## Auth

Shared-password access gate. There is **no per-user identity** — a correct password mints a signed session cookie that grants full access. Implemented in `lib/auth/session.ts` (HMAC-SHA256 via Web Crypto) and enforced globally by `proxy.ts`. Requires `AUTH_PASSWORD` **and** `AUTH_SECRET` env vars (both public paths below still return `500` / block if unset).

### `POST /api/auth/login`
- **Runtime:** `nodejs`. Public (not gated).
- **Body:** `{ password: string }`.
- **Logic:** constant-time compare against `AUTH_PASSWORD`; on success `createSessionToken()` (8h expiry) → sets `dl_session` cookie (`httpOnly`, `sameSite:lax`, `secure` in production, `maxAge` 8h).
- **Response:** `200 { ok:true }` (+ `Set-Cookie`) · `401 { error:"Incorrect password" }` · `400 { error:"Invalid request body" }` · `500 { error:"Auth is not configured" }`.
- **Consumers:** `app/login/page.tsx`.

### `POST /api/auth/logout`
- **Runtime:** `nodejs`. Public (not gated).
- **Logic:** clears the `dl_session` cookie (`maxAge:0`).
- **Response:** `200 { ok:true }`.
- **Consumers:** Topbar sign-out button.

---

## AI Assistant

### `POST /api/ai-assistant`  — **streaming** (`text/plain`)
- **Body:** `{ context?, portfolioSnapshot?, messages?: {role, text}[], model?, persona? }`.
- **Logic:** RAG `searchDocuments(context+question, 4)` (best-effort) → build context (page context + portfolio snapshot sentence + RAG block) → **Gemini** streaming (`:streamGenerateContent?alt=sse`, temp 0.3, maxOutputTokens 512, `systemInstruction` = persona) if `model==="gemini"` && `GEMINI_API_KEY`; else/on failure **Ollama** streaming (`/api/chat`, stream:true, temp 0.3, num_predict 512).
- **Response:** streamed token text; headers `X-AI-Model`, `X-RAG-Used`, `Cache-Control: no-store`. Ollama fetch failure → plain fallback message; Ollama non-OK → `502`.
- **Personas:** `standard`, `risk`, `esg`, `conservative` (fallback `standard`).
- **Consumers:** `useAIAssistantDrawerViewModel` (reads the stream via `getReader`).

---

## RAG

### `GET /api/rag/search`
- **Params:** `q` (required → else `400`), `k?` (default 5).
- **Logic:** `searchDocuments(q, k)` (pgvector cosine `<=>`).
- **Response:** `200 { query, results: SearchResult[] }` · `500 { error, detail }`.

### `HEAD /api/rag/search`
- **Logic:** `$queryRawUnsafe("SELECT COUNT(*) FROM documents")` (static literal).
- **Response:** empty body, header `X-Document-Count` · `503` on error.

### `POST /api/rag/ingest`
- **Params:** `force=true?`.
- **Logic:** count documents (skip if `>0 && !force`); if `force` → `DELETE FROM documents`; chunk each `mock-data/documents/*.md` (`chunkText`) and each DB recommendation (`formatRecommendationChunk`), embed (`getEmbedding`), `INSERT` with parameterized `$1..$5` (`… $5::vector`).
- **Response:** `200 { message, documents, recommendations, totalChunks, results[] }` · `500 { error, detail }`.
- **Note:** Not run by seed; call manually to enable RAG.

---

## Cross-cutting

- **Validation** is hand-rolled (no zod): status sets, `parseSignalCreateBody`, `parse*RecommendationRequest`, `validateGeneratedRecommendationJson`.
- **Error shape** is consistently `{ error: string }` (some add `detail`). Handlers log via `console.error`/`console.warn` and return generic messages.
- **Raw SQL** only in `lib/rag/search.ts` and `api/rag/*` — all static literals or bound `$n` params (no injection surface).
- **Async params:** dynamic route params are awaited (`await context.params`) per Next.js 16.
