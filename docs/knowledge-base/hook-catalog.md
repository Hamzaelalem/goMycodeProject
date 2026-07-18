# Hook & View-Model Catalog

Two kinds of hooks: **generic hooks** in `lib/hooks/*` and **view-models** (`use<Name>ViewModel`) co-located with views. Only these touch `useGlobalStore` and the network.

## Generic hooks (`lib/hooks/`)

### `useData.ts` — `useFetchWithFallback<T>` + wrappers
- **Inputs:** `(apiPath, mockData, params?)`. **Output:** `{ data, loading, error, refetch, isFromMock }`.
- **Behavior:** `GET /api/<apiPath>?<params>`; on failure warns and returns `mockData` with `isFromMock: true`. `useEffect` keyed on a `useCallback` (`paramsKey = JSON.stringify(params)`).
- **Wrappers:** `useRecommendations`, `useSignals`, `useRiskScores`, `useEsgInputs`.
- **Note:** parallel to the store bootstrap path; **appears unused by the current pages** (they read the store). Candidate for consolidation.

### `useSignalStream.ts` — `useSignalStream(enabled=true, intervalMs=30_000)`
- **Primary transport (SSE):** opens an `EventSource('/api/signals/stream')` and appends pushed `signal` events via a deduped `addSignal`. Real-time; no client polling while connected.
- **Fallback (polling):** if SSE can't establish within ~4s (or `EventSource` is unavailable), starts the legacy 30s `GET /api/signals?after=<latestIso>&limit=15` loop. Once SSE is open, `onerror` lets `EventSource` auto-reconnect; a never-opened connection falls back to polling.
- **Outage resilience (poll mode):** synthesizes signals from 3 local `TEMPLATES` × `SOURCES` when the API has **never** succeeded (offline dev) **or** during a sustained mid-session outage (`consecutiveFailures >= 2`); a single transient blip is ignored.
- **Visibility-aware:** poll mode skips while `document.visibilityState === "hidden"` and ticks on return to visible.
- **Store:** writes `addSignal`; reads live state via `getState()`. Booted once by `SignalStreamBoot` in the root layout.

### `useSignalNavigation.ts` — `useNavigateFromSignal(): (signal) => void`
- Calls `applySignalCrossModuleLinks(signal, actions)` (sets selected signal + region/sector/risk-factor/workflow-focus) then `router.push(routeForSignal(signal))`. The single entry point for signal clicks.

### `useDebounce.ts` — `useDebounce<T>(value, delayMs=150): T`
- Standard debounce via `setTimeout`. Used by the scenarios view-model.

### `useCrossModuleFilter.ts` — `useFilteredSignals(signals): Signal[]`
- Reads `activeRegionFilter`/`activeSectorFilter`/`activeRiskFactor`; filters signals by region/sector; for risk factor, excludes only signals that declare a *different* factor (untagged pass). `useMemo`.

### `useSignalActions.ts` — `useSignalActions()`
- Shared signal interactions used by **both** live-feed view-models (page + right rail). Returns `{ selectedSignal, navigateFromSignal, handleSelect, handleAIAssessment, handleStressTest }`.
- `handleSelect` toggles store selection; `handleAIAssessment` opens the AI drawer with an impact-assessment prompt; `handleStressTest` maps the signal to macro inputs and routes to `/scenarios`.
- Introduced 2026-07-18 to remove byte-for-byte duplication that previously lived in each live-feed VM.

## View-models — pages

| Hook | Store reads | Store writes / actions | API | Key outputs |
|---|---|---|---|---|
| `useDashboardViewModel` | recommendations, signals, riskFactorScores, esgSectors | — | — | `kpis, riskLine, esgSectors, topRecs, liveFeedPreview` |
| `useRecommendationsViewModel` | recommendations, activeRegion/SectorFilter | setActiveRegion/SectorFilter, bootstrapData, addRecommendation | `generateRecommendationApi` | filters+setters, `filtered`, `handleGenerateRecommendation`, `resetFilters`, `generating`, `generationError` |
| `useRiskViewModel` | activeRiskFactor, selectedRecommendation, riskFactorScores | — | — | `activeRiskFactor, factors (+8 boost), stats` |
| `useEsgViewModel` | selectedRecommendation, esgSectors, activeSectorFilter | mergeEsgSector, setActiveSectorFilter | `updateEsgSectorApi` | local `data`, `selectedSector`, avg E/S/G, `overall`, `syncSector`, `updateKpi`, `handleSave` |
| `useScenariosViewModel` | selectedRecommendation, scenarioInputs, savedScenarios | setScenarioInputs, saveScenarioAction, loadSavedScenariosAction | (via store actions) | `inputs`, `cards`, `projection` (with compared overlays), `setValue`, `toggleCompare`, `applyPreset`, `handleSaveCurrent` |
| `useWorkflowViewModel` (+`mapStatus`) | workflowLogEntries, recommendations, workflowFocusRecommendationId | setWorkflowFocusRecommendationId, openAIDrawer, updateRecommendationStatus | — | `recs, selectedId, current, entries, kpis, handleApprove/Reject, handleGetAIInput` |
| `useLiveFeedViewModel` | signals, selectedSignal | setSelectedSignal, setScenarioInputs, openAIDrawer, setAiDrawerInitialMessage | — | filters, `rows`, `bySource`, `virtualizer`, `handleSelect`, `handleAIAssessment`, `handleStressTest`, `navigateFromSignal` |

### Notable view-model mechanics
- **`useEsgViewModel`** keeps a local editable copy of `esgSectors` synced via `useEffect`; `updateKpi` recomputes overall score + letter grade (A/A-/B+/B/C) locally; changes persist only on Save.
- **`useScenariosViewModel`** debounces `scenarioInputs` (150ms) before `computeScenarioCards`/`computeIrrProjection`; `projection` merges compared saved scenarios' `irrProjection.base` under dynamic keys (uses `any`).
- **`useWorkflowViewModel`** uses `requestAnimationFrame` + `rowRefs` to scroll to a focused recommendation, then clears `workflowFocusRecommendationId`.
- **`useLiveFeedViewModel`** re-measures the virtualizer when the selected signal changes (dynamic row height 240/112).

## View-models — layout & drawers

| Hook | Purpose | Store |
|---|---|---|
| `useTopbarViewModel` | Page title from pathname + `handleAskAI` | writes `openAIDrawer` |
| `useNotificationBellViewModel` | `{ unread, markSignalsRead }` | reads `unreadSignalCount`, writes `markSignalsRead` |
| `useLiveFeedPanelViewModel` | Right-rail selection + AI/stress-test actions | via `useSignalActions`; reads `signals`; uses `useFilteredSignals().slice(0,10)` |
| `useRecommendationDrawerViewModel` | Selected rec + linked signals + workflow entries + actions | reads workflowLogEntries, selectedRecommendation, isRecommendationDrawerOpen, signals; writes closeRecommendationDrawer, updateRecommendationStatus, openAIDrawer |
| `useAIAssistantDrawerViewModel` | Streaming chat state + `ask()` | reads isAIDrawerOpen, aiDrawerContext, aiDrawerInitialMessage, aiModel, aiPersona, getPortfolioSnapshot; writes closeAIDrawer, setAiDrawerInitialMessage, setAiModel, setAiPersona. Streams `POST /api/ai-assistant` |

### Notable
- **`useAIAssistantDrawerViewModel`** auto-sends `aiDrawerInitialMessage` on open then clears it; the auto-send effect intentionally omits `ask` from deps (relies on the cleared message to avoid loops). `ask` keeps the last 10 messages (`slice(-9)` + new).
- **`useRecommendationDrawerViewModel`** re-implements the status→`WorkflowStatus` mapping inline (duplicates `mapStatus`).

## Conventions for new hooks
- Put cross-feature logic in `lib/hooks/*`; put feature logic in a co-located `use<Name>ViewModel.ts`.
- View-models own store subscriptions and network; return plain data + handlers so views stay presentational.
- Derive with `useMemo`; keep optimistic-update + revert consistent with existing store actions.
