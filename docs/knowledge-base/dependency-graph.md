# Dependency Graph

How the layers connect: **component → hook/view-model → service → API → Prisma model**, plus shared utilities.

## Layered overview

```mermaid
flowchart TD
    subgraph Views
        DP[DashboardPage]
        RP[RecommendationsPage]
        RKP[RiskPage]
        EP[EsgPage]
        SP[ScenariosPage]
        WP[WorkflowPage]
        LP[LiveFeedPage]
        RD[RecommendationDrawer]
        AID[AIAssistantDrawer]
    end
    subgraph ViewModels
        VMd[useDashboardVM]
        VMr[useRecommendationsVM]
        VMk[useRiskVM]
        VMe[useEsgVM]
        VMs[useScenariosVM]
        VMw[useWorkflowVM]
        VMl[useLiveFeedVM]
        VMrd[useRecDrawerVM]
        VMai[useAIDrawerVM]
    end
    Store[(useGlobalStore)]
    subgraph Services
        MUT[lib/api/mutations]
        NAV[useNavigateFromSignal → signalCrossModule]
        SAM[signalActionMapping]
        CMF[useCrossModuleFilter]
        DBC[useDebounce]
        SV2[scenarios.v2 compute*]
    end
    subgraph APIs[/app/api/*/]
        Arec[recommendations*]
        Asig[signals]
        Arisk[risk]
        Aesg[esg]
        Ascn[scenarios]
        Awf[workflow]
        Aai[ai-assistant]
        Arag[rag/*]
    end
    subgraph AI[lib/llm + lib/rag + lib/recommendations]
        LLM[gemini/ollama]
        RAG[embed/search/chunk]
        GEN[generateRecommendation + schema]
        MKT[simulatedMarketContext]
    end
    Prisma[(Prisma → Postgres+pgvector)]

    DP-->VMd RP-->VMr RKP-->VMk EP-->VMe SP-->VMs WP-->VMw LP-->VMl RD-->VMrd AID-->VMai
    VMd-->Store VMr-->Store VMk-->Store VMe-->Store VMs-->Store VMw-->Store VMl-->Store VMrd-->Store VMai-->Store
    VMr-->MUT VMe-->MUT VMs-->Store
    VMl-->CMF VMl-->SAM VMl-->NAV VMs-->DBC VMs-->SV2
    Store-->Arec Store-->Asig Store-->Arisk Store-->Aesg Store-->Ascn Store-->Awf
    MUT-->Arec MUT-->Aesg MUT-->Ascn
    VMai-->Aai VMr-->Arec
    Arec-->GEN Aai-->RAG Aai-->LLM GEN-->LLM GEN-->RAG GEN-->MKT Arag-->RAG
    Arec-->Prisma Asig-->Prisma Arisk-->Prisma Aesg-->Prisma Ascn-->Prisma Awf-->Prisma
    RAG-->Prisma GEN-->Prisma
```

## Component → view-model → store

Each page view imports exactly one view-model; view-models are the only store subscribers. Store-connected components outside the MVVM pages: `RecommendationCard` (writes status/drawer), `RiskFactorRow` (writes active factor), `GlobalSearch`, `NotificationBell` (VM), `MockDataSourceBanner`, `DataBootstrap`, `SignalStreamBoot`.

## View-model → service

| View-model | Services used |
|---|---|
| `useRecommendationsViewModel` | `lib/api/mutations.generateRecommendationApi`, store `bootstrapData` |
| `useEsgViewModel` | `lib/api/mutations.updateEsgSectorApi` |
| `useScenariosViewModel` | `useDebounce`, `mock-data/scenarios.v2` compute*, store `saveScenarioAction`/`loadSavedScenariosAction` |
| `useLiveFeedViewModel` / `useLiveFeedPanelViewModel` | `useCrossModuleFilter`, `useSignalNavigation`, `signalActionMapping`, `@tanstack/react-virtual` |
| `useWorkflowViewModel` | store `updateRecommendationStatus`, `openAIDrawer` |
| `useAIAssistantDrawerViewModel` | `fetch /api/ai-assistant` (direct), store snapshot |
| `useRecommendationDrawerViewModel` | store `updateRecommendationStatus`, `openAIDrawer`, `next/navigation` |

## Service/store → API → model

| Caller | Endpoint | Prisma model(s) | Mapper |
|---|---|---|---|
| `bootstrapData`, `useData` | `GET /api/recommendations` | Recommendation | recommendationMapper |
| `updateRecommendationStatusApi` | `PATCH /api/recommendations/:id` | Recommendation, RecommendationAuditLog | recommendationMapper |
| `generateRecommendationApi` | `POST /api/recommendations/generate` | Recommendation, AuditLog (+reads Signal/Risk/Esg/Scenario/Document) | recommendationMapper |
| `bootstrapData`, `useSignalStream` | `GET /api/signals` | Signal | signalMapper |
| — | `POST /api/signals` | Signal | signalMapper |
| `bootstrapData` | `GET /api/risk` | RiskFactorScore | riskMapper |
| `bootstrapData` | `GET /api/esg` | EsgSectorInput | esgMapper |
| `updateEsgSectorApi` | `PATCH /api/esg` | EsgSectorInput | esgMapper |
| `bootstrapData`, `saveScenarioBundleApi` | `GET/POST /api/scenarios` | ScenarioSnapshot | inline |
| `bootstrapData` | `GET /api/workflow` | Recommendation, WorkflowLogEntry | rec/workflow mappers |
| assistant VM | `POST /api/ai-assistant` | Document (via RAG) | — |
| — | `GET/POST /api/rag/*` | Document | — |

## AI subsystem internal deps

```
generateRecommendation.ts → gemini.ts | ollama.ts (LLM)
                          → rag/search.ts → rag/embed.ts → gemini|ollama embeddings
                          → online/simulatedMarketContext.ts
                          → recommendations/schema.ts (validation)
                          → mappers/recommendationMapper.ts
                          → db/prisma.ts
ai-assistant/route.ts     → rag/search.ts (+ inline Gemini/Ollama streaming)
rag/ingest/route.ts       → rag/chunk.ts, rag/embed.ts, db/prisma.ts
```

## Shared utilities (fan-in)

| Utility | Consumers |
|---|---|
| `lib/utils.cn` | most UI components |
| `lib/utils/formatters` (`formatCurrencyCompact`, `formatPct`, `formatTimeAgo`) | RecommendationCard, ScenarioCard, TimeAgo |
| `lib/utils/colorHelpers` (`COLORS`, `scoreTone`, `severityColors`) | StatusBadge, SeverityBar, ConfidenceGauge |
| `lib/dataSource` (`DATA_DOMAINS`) | store bootstrap, MockDataSourceBanner |
| `lib/db/prisma` | every API route + AI service |
| `lib/mappers/*` | domain GET/PATCH routes |
| `@/types` barrel | nearly everything |
| `lib/navigation/signalCrossModule` | `useSignalNavigation`, live-feed VMs |

## Dependency observations

- **No import cycles detected** across the read layers; the store centralizes coordination so components don't depend on each other directly (except cards used by pages).
- **`mock-data` is a runtime dependency**, not just seed: imported by the store (initial state + fallback), `useData`, `generateRecommendation` (fallbacks), and `scenarios.v2` compute functions (used by both UI and seed).
- **Two data paths** converge on the same endpoints: store `bootstrapData` (primary) and `useData` hooks (secondary/unused by pages).
- **`types/index.ts` legacy block was removed (2026-07-18)** together with the dead kebab-case charts that consumed it; `types/index.ts` now re-exports only the authoritative domain types.
