# Feature Guide & End-to-End User Flows

Seven features, each a sidebar route. All follow MVVM (`page.tsx → <Name>Page.tsx → use<Name>ViewModel.ts`). Shared chrome (root layout): `Sidebar`, `Topbar`, `LiveFeedPanel` (right rail), `RecommendationDrawer`, `AIAssistantDrawer`, `MockDataSourceBanner`, `SignalStreamBoot`.

---

## 1. Dashboard (`/dashboard`)

**Purpose:** Executive overview — KPIs, risk trend, ESG by sector, top recommendations, live-feed preview.

- **View:** `DashboardPage.tsx` → 4 `KPICard` (Total recs, Avg confidence, Portfolio risk, ESG score), `RiskTrendLine`, `ESGBarChart`, top-3 `RecommendationCard`, 3 signal previews.
- **View-model:** `useDashboardViewModel` — reads `recommendations`, `signals`, `riskFactorScores`, `esgSectors`; derives `kpis`, `riskLine` (7-day avg from sparklines), `topRecs` (top 3 by confidence), `liveFeedPreview` (first 3). Read-only.
- **APIs (via bootstrap):** all six domain GETs. **Models:** all.

**Flow:** App load → `DataBootstrap` → `bootstrapData()` fetches domains → store fills → `useDashboardViewModel` derives → cards/charts render. Interacting with a `RecommendationCard` (Review/Approve/Reject) delegates to the recommendation flow below.

---

## 2. Recommendations (`/recommendations`)

**Purpose:** Browse/filter AI recommendations and generate new ones via the LLM+RAG pipeline.

- **View:** `RecommendationsPage.tsx` → region/sector/risk/status `Select`s, confidence `Slider`, Reset + Generate `Button`s, `RecommendationCard` grid, `RecommendationDrawer`; `RecommendationSkeleton` while empty.
- **View-model:** `useRecommendationsViewModel` — region/sector filters live in the **store** (`activeRegionFilter`/`activeSectorFilter`, cross-module); risk/status/confidence are **local** state. `filtered` is a `useMemo`. `handleGenerateRecommendation` → `generateRecommendationApi(...)`.
- **APIs:** `GET /api/recommendations`, `POST /api/recommendations/generate`. **Models:** `Recommendation`, `RecommendationAuditLog` (+ reads Signal/Risk/Esg/Scenario/Document during generation).

**Generate flow (end-to-end):**
```
Click "Generate" → handleGenerateRecommendation()
  → POST /api/recommendations/generate { focusSector, focusRegion, riskAppetite, horizonYears:6 }
  → route: parseGenerateRecommendationRequest → generateRecommendation()
      → Prisma reads (recs/signals/risk/esg/scenario/maxRank) + RAG searchDocuments(query,6)
      → buildSimulatedMarketContext → buildPrompt → Gemini|Ollama JSON
      → validate + dedupe title + recompute confidence/risk breakdown
      → prisma.recommendation.create (status "pending_review", nested auditLog action "generated")
      → 201 { recommendation }
  → store.addRecommendation(data) + set region/sector filters + await bootstrapData()
  → new card appears; failure → generationError shown
```

**Approve/Reject from a card:** `RecommendationCard` → `updateRecommendationStatus(id, status)` (optimistic) → `PATCH /api/recommendations/:id` → on success replace row; on failure revert. Review → `openRecommendationDrawer(rec)`.

---

## 3. Risk (`/risk`)

**Purpose:** Portfolio risk factors and their trend, contextualized by the selected recommendation.

- **View:** `RiskPage.tsx` → 4 `KPICard` (Critical, High, Portfolio score, 7-day trend), `RiskFactorRow` list (active factor gets a ring), `RiskRadarChart` (current vs previous week).
- **View-model:** `useRiskViewModel` — reads `activeRiskFactor`, `selectedRecommendation`, `riskFactorScores`. If a recommendation is selected, factors named in its `riskFactors` get `+8` (capped 100). Derives `stats` (critical ≥75, high 60–74, avg, signed trend text). Read-only display.
- **API:** `GET /api/risk`. **Model:** `RiskFactorScore`.

**Cross-module:** `RiskFactorRow` click → `setActiveRiskFactor(name)`; a risk-type signal click elsewhere sets the same field and routes here.

---

## 4. ESG (`/esg`)

**Purpose:** ESG scores per sector with an editable KPI editor that recomputes and persists.

- **View:** `EsgPage.tsx` → 4 `KPICard` (avg E/S/G + overall grade), `ESGBarChart` (click a bar to select a sector), sector `Select`, editable `ESGCompanyRow` list, Save `Button`.
- **View-model:** `useEsgViewModel` — keeps a **local editable copy** `data` synced from store `esgSectors` via effect; `updateKpi` recomputes overall score + letter grade locally; `handleSave` → `updateEsgSectorApi(sector, {kpis, scores})` then `mergeEsgSector` into the store.
- **API:** `GET /api/esg`, `PATCH /api/esg`. **Model:** `EsgSectorInput` (`payload` Json).

**Edit flow:** select sector (store `activeSectorFilter` synced) → edit KPI values (local recompute) → Save → PATCH → merge result into store + local. Edits are local until Save.

---

## 5. Scenarios (`/scenarios`)

**Purpose:** Macro "what-if" sandbox — sliders drive scenario cards + a 10-year IRR projection; save/compare named sandboxes.

- **View:** `ScenariosPage.tsx` → 4 slider controls with numeric entry + min/max labels (oilPrice, fxDeltaPct, interestRate, inflationRate) + Reset, an Expected-IRR (probability-weighted) header chip, save-name input + Save, scoped saved-scenario list ("This deal"/"Global" badges) with compare checkboxes + Load, `ScenarioComparisonChart` (with E[IRR] reference line), `IRRProjectionChart` (with compared overlays), `ScenarioTornadoChart` (sensitivity), `ScenarioMonteCarloChart` (P10–P90 band), an AI scenario-explanation card (Explain button), `ScenarioCard` grid.
- **View-model:** `useScenariosViewModel` — inputs live in store (`scenarioInputs`); `useDebounce(inputs,150)` feeds `computeScenarioCards` / `computeIrrProjection` / `expectedIrr` / `computeSensitivity` / `computeMonteCarloBands` (from `lib/scenarios/compute`). The scenario anchor is seeded from the selected recommendation via `baseFromRecommendation`. Saved sandboxes are scoped by recommendation (key `"<recId>::<name>"`) and filtered to global + current-deal; `handleExplain` → `explainScenarioApi`. On mount loads saved scenarios; `handleSaveCurrent` → `saveScenarioAction`; `resetInputs` → store `resetScenarioInputs`.
- **APIs:** `GET /api/scenarios` (default + `?all=true`), `POST /api/scenarios` (upsert). **Model:** `ScenarioSnapshot` (Json columns).

**Save flow:** adjust sliders (store update, debounced recompute) → name + Save → `saveScenarioAction` optimistically adds to `savedScenarios` then `POST /api/scenarios` upsert by `key`.

**Stress-test entry point:** from a signal (`handleStressTest`) → `getMacroInputsForSignal` computes macro inputs → `setScenarioInputs` → `router.push('/scenarios')` → sliders pre-set.

---

## 6. Workflow (`/workflow`)

**Purpose:** Approval queue — select a recommendation, see its status timeline, comment, approve/reject, or ask AI.

- **View:** `WorkflowPage.tsx` → 5 KPI cards (Total/Pending/Approved/Rejected/Avg approval "2.4d" hard-coded), queue buttons with `StatusBadge`, `StatusTimeline`, comment `Textarea`, Get-AI-input/Approve/Reject buttons.
- **View-model:** `useWorkflowViewModel` (+ exported `mapStatus`) — reads `workflowLogEntries`, `recommendations`, `workflowFocusRecommendationId`; on focus id, selects + scrolls the row then clears focus. `handleApprove/handleReject` → `updateRecommendationStatus(id, 'approved'|'rejected', comment)`. `handleGetAIInput` → `openAIDrawer(...)`.
- **API:** `GET /api/workflow` (returns `{recommendations, workflowLogs}`). **Models:** `Recommendation`, `WorkflowLogEntry`.

**Cross-module:** a `deal`-type signal sets `workflowFocusRecommendationId` and routes here, auto-scrolling to the item.

---

## 7. Live Feed (`/live-feed`) + right-rail panel

**Purpose:** Real-time signal stream with filtering, virtualization, and per-signal actions.

- **View:** `LiveFeedPage.tsx` → source count cards, type/severity filter buttons, region/sector `Select`s, Reset, a **TanStack-virtualized** row list; expanded row shows AI Assess / Stress Test / Investigate.
- **View-model:** `useLiveFeedViewModel` — combines `useFilteredSignals` (cross-module filters) with local type/severity/region/sector filters; `useVirtualizer` (240px selected / 112px otherwise). Actions: `handleAIAssessment` (open AI drawer with impact prompt), `handleStressTest` (macro inputs → scenarios), `navigateFromSignal` (cross-module route).
- **Right rail:** `LiveFeedPanel` + `useLiveFeedPanelViewModel` show the last 10 filtered signals with the same actions (always mounted in root layout).
- **Stream:** `SignalStreamBoot` → `useSignalStream` polls `/api/signals?after=…&limit=15` every 30s, `addSignal`s new rows; synthetic fallback if API never succeeds.
- **API:** `GET /api/signals`, `POST /api/signals`. **Model:** `Signal`.

**Signal click flow (`useNavigateFromSignal`):**
```
click signal → applySignalCrossModuleLinks(signal, actions)
  → setSelectedSignal + set region/sector (+ riskFactor for risk, +workflowFocus for deal)
  → router.push(routeForSignal(signal))
      risk→/risk  opportunity→/recommendations  deal→/workflow  policy→/esg  market/other→/live-feed
```

---

## Cross-feature: AI Assistant drawer

Opened from Topbar "Ask AI", card/drawer "Ask AI", workflow "Get AI input", or a signal's "AI Assess". `useAIAssistantDrawerViewModel` streams `POST /api/ai-assistant` with `{messages, context, portfolioSnapshot, model, persona}`. Supports model toggle (Gemini/Ollama), 4 personas (standard/risk/esg/conservative), suggested prompts, copy/clear, and **auto-send** of an injected `aiDrawerInitialMessage`. See [ai-subsystem.md](ai-subsystem.md).

---

## Global search (Cmd/Ctrl-K)

`GlobalSearch` (in `Topbar`) searches recommendations, signals, and risk factors; selecting a result sets the appropriate store fields (`setSelectedRecommendation`, `setActiveRiskFactor`, `setSelectedSignal`, filters, workflow focus) and/or routes — another cross-module entry point built on the store-as-event-bus pattern.
