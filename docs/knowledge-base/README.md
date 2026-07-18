# Decision Layer Dashboard — Knowledge Base

> Authoritative reference for the project. **Future work should rely on this knowledge base instead of rediscovering the codebase.** If code and these docs disagree, update the docs in the same change.

## What this project is

An AI-powered **Executive Command Center** ("Decision Layer") for investment decision-making at a client referred to as **CLIENT** (database `client_ecc`). It surfaces AI-generated investment **recommendations**, a live market **signal** feed, **risk** scoring, **ESG** analysis, macro **scenario** modeling, and an approval **workflow** — plus a RAG-backed **AI assistant** and on-demand recommendation generation.

## Tech at a glance

| Concern | Choice |
|---|---|
| Framework | Next.js **16.2.4** (App Router), React **19.2.4** |
| Language | TypeScript 5 (strict), path alias `@/* → ./*` |
| Styling | Tailwind **v4** (CSS `@theme`), shadcn (`base-nova`), Radix, OKLCH tokens |
| State | Zustand **5** (single global store) |
| Charts | Recharts **3** (gated via `chart-gate`), TanStack Virtual |
| DB | PostgreSQL + **pgvector** (`pgvector/pgvector:pg16`), Prisma **5.22.0** |
| AI | Google **Gemini** (primary) with local **Ollama** fallback |

## Index

| Doc | Contents |
|---|---|
| [architecture.md](architecture.md) | Architecture guide, folder structure, data flow, config/deployment, coding conventions, hidden assumptions, dev workflow |
| [features-and-user-flows.md](features-and-user-flows.md) | Feature guide (7 features) + end-to-end user journeys |
| [component-catalog.md](component-catalog.md) | Every component: responsibility, props, parents/children, duplication table, dead code |
| [hook-catalog.md](hook-catalog.md) | Every hook + view-model: inputs, outputs, side effects, store/API |
| [state-management.md](state-management.md) | Zustand store: state, actions, readers/writers, state-flow diagram |
| [api-reference.md](api-reference.md) | Every endpoint: method, request/response schema, validation, DB access, consumers |
| [database-reference.md](database-reference.md) | Every Prisma model: fields, relations, indexes, lifecycle, migrations, seed |
| [ai-subsystem.md](ai-subsystem.md) | Gemini/Ollama, embeddings, vector search, RAG, generation, personas, confidence |
| [dependency-graph.md](dependency-graph.md) | Component → hook → service → API → model dependency graph |
| [risks-and-backlog.md](risks-and-backlog.md) | Technical debt, dead code, fragile code, security gaps, improvement backlog |

## The six data domains

`recommendations`, `signals`, `risk`, `esg`, `scenarios`, `workflow` — enumerated in `lib/dataSource.ts` (`DATA_DOMAINS`).

## Critical facts to remember

- **MVVM everywhere:** `app/<d>/page.tsx` (thin, `dynamic(ssr:false)`) → `components/pages/<d>/<Name>Page.tsx` (presentational) → `use<Name>ViewModel.ts` (the **only** layer that touches the store/API).
- **LLM selection is uniform:** Gemini when `GEMINI_API_KEY` is set, otherwise Ollama. This applies to embeddings, chat, and recommendation generation.
- **Two data-loading paths coexist:** the global-store `bootstrapData()` (primary; consumed by pages) and per-component `useData.ts` hooks (`useFetchWithFallback`, appears largely unused by pages). Prefer the store path.
- **Mock fallback is by design:** every domain falls back to `mock-data/*` when its API/DB is unavailable; a full DB outage is treated as normal in dev.
- **Authoritative types** live in `types/<domain>.ts`. The bottom of `types/index.ts` is a **legacy back-compat block** ("will be removed after refactor") — do not build on it.
- **There is no authentication/authorization anywhere.** `generateRecommendation.ts` even persists to the DB behind a `// TODO: Add auth and role checks`.
