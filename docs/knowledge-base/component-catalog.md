# Component Catalog

Every component with responsibility, props, parents/children, store use, and reusability. **Dead components are flagged.** See the duplication table at the end.

## Cards (`components/cards/`)

| Component | Props | Store | Renders | Used by |
|---|---|---|---|---|
| `KPICard` | `label, value, hint?` | — | `Card` | Dashboard, ESG, Risk |
| `RecommendationCard` | `rec: Recommendation` | writes `openRecommendationDrawer`, `updateRecommendationStatus` | `ConfidenceGauge`, `StatusBadge`, `Button`×3, `TimeAgo` | Dashboard, Recommendations |
| `SignalCard` | `signal: Signal`, `navigable?` | via `useNavigateFromSignal` | `SeverityBar`, `StatusBadge`×2, `TimeAgo` | RecommendationDrawer |
| `ScenarioCard` | `item: ScenarioCard`, `active`, `onClick` | — | `Card` | Scenarios |
| `RiskFactorRow` | `factor: RiskFactorScore` | writes `setActiveRiskFactor` | `Progress`, `StatusBadge`, arrows | Risk |
| `ESGCompanyRow` | `kpi: EsgSectorKpi`, `onChange` | — | `Label`, `Input` | ESG |

> `cards/kpi-card.tsx` (`KpiCard`) was **removed** on 2026-07-18 (dead code).

## Charts (`components/charts/`) — all recharts, wrapped in `ChartResponsive`

| Component | Props | Used by | Status |
|---|---|---|---|
| `chart-gate` (`ChartGate`, `ChartResponsive`) | `height`, `children` | every chart | **Core (infra)** |
| `RiskTrendLine` | `points: {day,score}[]` | Dashboard | Core |
| `ESGBarChart` | `sectors: EsgSectorInputs[]`, `onSelectSector?` | Dashboard, ESG | Core |
| `RiskRadarChart` (Pascal) | `factors: RiskFactorScore[]` (current+previous) | Risk | Core |
| `ScenarioComparisonChart` | `cards: ScenarioCard[]` | Scenarios | Core |
| `IRRProjectionChart` | `data: IrrProjectionPoint[]`, `comparedNames?` | Scenarios | Core |
| `ui/ScoreBreakdownChart` | `recommendation: Recommendation` (radar) | RecommendationDrawer | Core (lives in `ui/`) |

> **Removed 2026-07-18 (dead code):** `risk-radar-chart.tsx`, `risk-trend-chart.tsx`, `score-breakdown-chart.tsx`, `esg-breakdown-chart.tsx`, `risk-factors-bar-chart.tsx`, `scenario-projection-charts.tsx`. Only the live PascalCase charts remain (plus `chart-gate`).

## Layout (`components/layout/`)

| Component | Props | Store | Notes |
|---|---|---|---|
| `Sidebar` | — | — | 7 nav links + active highlight; pulse dot on Live Feed |
| `Topbar` | — | via VM (`openAIDrawer`) | title, `GlobalSearch`, `NotificationBell`, avatar, Ask AI |
| `NotificationBell` | — | reads `unreadSignalCount`, writes `markSignalsRead` | badge |
| `LiveFeedPanel` | — | via VM | right rail, last 10 signals + actions |
| `MockDataSourceBanner` | — | reads `bootstrapComplete`, `sourcesFromDb`, `lastBootstrapError`; calls `bootstrapData` | renders `APIErrorCard` + `MockDataBanner` |
| `DataBootstrap` | — | calls `bootstrapData()` (once) | headless, returns `null` |
| `SignalStreamBoot` | — | via `useSignalStream` | headless, returns `null` |

## Drawers (`components/drawers/`)

| Component | Props | Store | Children |
|---|---|---|---|
| `RecommendationDrawer` | — | via VM | `Sheet`, `ScoreBreakdownChart`, `SignalCard`×n, `StatusTimeline`, `Button`×4 |
| `AIAssistantDrawer` | — | via VM | `Sheet`, model buttons, persona `Select`, suggested prompts, message list, `Textarea`, Send/Copy/Clear |

## UI — app-specific (`components/ui/`)

| Component | Props | Notes |
|---|---|---|
| `ConfidenceGauge` | `value`, `className?` | hand-rolled SVG gauge (no recharts) |
| `GlobalSearch` | — | Cmd/Ctrl-K palette; searches recs/signals/risk; writes many store fields + routes |
| `StatusBadge` (impl) | `kind: severity\|workflow\|signalType`, `value`, `className?` | colored pill; import via `status-badge` barrel |
| `SeverityBar` (impl) | `severity`, `children` | left color bar; import via `severity-bar` barrel |
| `StatusTimeline` | `currentStatus: WorkflowStatus`, `entries: WorkflowLogEntry[]` | workflow stepper + log list |
| `TimeAgo` | `iso`, `className?` | client-only relative time (60s refresh; avoids hydration mismatch) |
| `APIErrorCard` | `error`, `onRetry` | red banner + Retry |
| `MockDataBanner` | `isFromMock`, `fullyOffline?` | presentational; null when not mock |
| `ScoreBreakdownChart` | `recommendation` | radar (the **used** score chart) |
| `status-badge`, `severity-bar` | — | **re-export barrels** (canonical import path) |

## UI — shadcn/Radix primitives
`avatar, badge, button, card, dialog, dropdown-menu, input, label, progress, scroll-area, select, separator, sheet, skeleton, slider, table, tabs, textarea, tooltip` — standard wrappers.
> Non-standard: `GlobalSearch`/`RecommendationDrawer` use the newer Radix `render={<Button/>}` slot API (not `asChild`); `Button` has an `xs` size used by `LiveFeedPanel`. Verify these in local copies before reuse.

## Skeletons (`components/skeletons/`)
`TableSkeleton` (5×5), `RecommendationSkeleton` (3 cards), `CardSkeleton` (1 KPI) — auxiliary placeholders. Route-level `loading.tsx` files (dashboard/recommendations/live-feed) use `ui/skeleton` directly.

## Providers
`Providers` — wraps `TooltipProvider` + mounts `DataBootstrap`.

---

## Duplication & dead-code table (post-cleanup)

The kebab-case dead duplicates were **removed on 2026-07-18**. Remaining non-duplicate barrels are intentional:

| Pair | Verdict | Live | Status |
|---|---|---|---|
| `ui/StatusBadge` vs `ui/status-badge` | Barrel re-export (not dupes) | both required | kept |
| `ui/SeverityBar` vs `ui/severity-bar` | Barrel re-export (not dupes) | both required | kept |
| `layout/MockDataSourceBanner` vs `ui/MockDataBanner` | Container vs presentational (not dupes) | both | kept |

**Rule of thumb:** live components are **PascalCase**; the only remaining kebab-case files are the intentional `status-badge`/`severity-bar` re-export barrels and `chart-gate`. Prefer PascalCase for new work, and always confirm with a reference search + `tsc --noEmit` before deleting.
