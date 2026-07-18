# Risks & Improvement Backlog

Observations only — **nothing here has been changed.** Each item notes impact and a suggested (future) direction. Ordered roughly by priority.

## Security

| # | Risk | Where | Impact |
|---|---|---|---|
| S1 | **No authentication/authorization anywhere.** Every API route is open; `generateRecommendation` persists to the DB behind a literal `// TODO: Add auth and role checks`. | all `app/api/**`, `lib/recommendations/generateRecommendation.ts` | Anyone who can reach the app can read/mutate portfolio data and trigger paid LLM calls |
| S2 | **Unbounded LLM cost / no rate limiting** on `/api/recommendations/generate` and `/api/ai-assistant`. | AI routes | DoS / cost-abuse vector |
| S3 | **`GEMINI_API_KEY` sometimes passed as a query param** (`…:streamGenerateContent?…&key=`) in the assistant route vs header (`x-goog-api-key`) elsewhere. | `app/api/ai-assistant/route.ts` | Key can leak into logs/proxies; standardize on the header |
| S4 | Dev DB password committed in `docker-compose.yml` / `config/database.env`. | config | Acceptable for local dev; must not carry to shared/prod |

> Not a risk: raw SQL in `lib/rag/*` uses static literals or bound `$n` params — **no SQL injection surface**.

## Dead code — ✅ REMOVED 2026-07-18

- ~~`components/cards/kpi-card.tsx` (`KpiCard`)~~ — deleted.
- ~~`components/charts/risk-radar-chart.tsx`, `risk-trend-chart.tsx`, `score-breakdown-chart.tsx`, `esg-breakdown-chart.tsx`, `risk-factors-bar-chart.tsx`, `scenario-projection-charts.tsx`~~ — deleted.
- ~~Legacy block in `types/index.ts`~~ (`RecommendationLegacy`, `RiskFactor`, `EsgBreakdown`, `EsgKpi`, `SignalItem`, `ScenarioPreset`, `ScenarioProjectionPoint`, `RiskBand`, `WorkflowStage`, `DashboardKpis`, `ScoreBreakdown`) — removed; `types/index.ts` now re-exports only the authoritative domain types.

Verified with reference searches, `tsc --noEmit` (clean), and lint (no new issues). `RiskTrendPoint` in `types/risk.ts` is now unused but kept (authoritative, not part of the legacy block).

## Duplicated logic

| # | Duplication | Where |
|---|---|---|
| D1 | Status → `WorkflowStatus` mapping | `mapStatus()` (workflow VM) vs inline nested ternary in `RecommendationDrawer` |
| D2 | Approve/Reject via `updateRecommendationStatus` | `useWorkflowViewModel` (with comment) vs `useRecommendationDrawerViewModel` (no comment) vs `RecommendationCard` |
| D3 | Two data-fetch paths | store `bootstrapData` vs `lib/hooks/useData.ts` (`useFetchWithFallback`, unused by pages) |
| D4 | LLM provider selection (`GEMINI_API_KEY` check) | repeated in `generateRecommendation`, `embed`, `ai-assistant` route |
| D5 | AI-assistant model/URL constants | redefined in `app/api/ai-assistant/route.ts` instead of importing from `lib/llm/*` |

**Direction:** extract a `mapRecommendationStatusToWorkflow` helper (D1), a shared approve/reject action wrapper (D2), pick one data path (D3), and a single `selectLlmProvider()` / shared config module (D4/D5).

## Fragile / smell

| # | Item | Where |
|---|---|---|
| F1 | `projection` overlay merge uses `any` and dynamic keys | `useScenariosViewModel` |
| F2 | Effect intentionally omits `ask` from deps to avoid a loop | `useAIAssistantDrawerViewModel` |
| F3 | Filter state split between store and local `useState` | `useRecommendationsViewModel`; ESG keeps a shadow copy of store data |
| F4 | Hard-coded UI values | Workflow "Avg approval 2.4d"; `allowedDevOrigins` LAN IP `192.168.1.18` |
| F5 | Hand-rolled validation instead of a schema lib | all API routes (`schema.ts`, `parseSignalCreateBody`) — works but verbose/inconsistent |
| F6 | Status-casing mismatch between `Recommendation.status` (lowercase) and `WorkflowStatus` (UPPERCASE) | types + DB |

## Scalability / maintainability

| # | Item | Impact |
|---|---|---|
| M1 | **Whole store hydrated client-side; all pages `ssr:false`** | No SSR/streaming benefits; large client bundles; SEO N/A (internal tool, so acceptable) |
| M2 | `bootstrapData` fetches all six domains **sequentially** | Slower cold load; could `Promise.all` |
| M3 | Signals capped at 500 in-store; live feed virtualized | OK for demo; a real stream needs pagination/windowing on the server |
| M4 | RAG IVFFlat `lists = 10` and full-table embed on ingest | Fine for a small corpus; revisit index params as documents grow |
| M5 | `documents` embeddings not seeded | RAG silently empty until `POST /api/rag/ingest` is run — easy to forget |
| M6 | Mock data is a **runtime** dependency (store init + fallbacks) | Ships mock arrays to the client; blurs demo vs real data |

## Documentation gaps

- `README.md` is still default `create-next-app` boilerplate (this knowledge base fills the gap; the README could link to it).
- No env-var reference outside this KB; no onboarding/runbook beyond `package.json` scripts.

## Suggested improvement backlog (future phases, prioritized)

1. **Add authentication + authorization** and gate mutating/AI routes (S1, S2).
2. **Standardize the Gemini key** to the header everywhere (S3).
3. **Consolidate the data-fetch path** — keep the store; remove/retire `useData.ts` or repurpose it (D3).
4. **Extract shared helpers:** status mapping, approve/reject action, LLM provider selection + config (D1, D2, D4, D5).
5. ~~**Remove dead code** (charts + legacy types + `kpi-card`)~~ — ✅ done 2026-07-18.
6. **Parallelize `bootstrapData`** and consider server components for initial read (M1, M2).
7. **Adopt a validation library** (e.g. zod) for API bodies and LLM output (F5).
8. **Auto-ingest RAG** on seed or first boot, or surface a clear "RAG empty" state (M5).
9. **Replace hard-coded UI metrics** (workflow avg approval) with real aggregates (F4).
10. **Rewrite `README.md`** to point at `docs/knowledge-base/`.

> Reminder: this backlog is advisory. Implementation is a later phase and must follow the conventions in [architecture.md](architecture.md).
