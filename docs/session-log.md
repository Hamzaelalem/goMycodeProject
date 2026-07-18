# Decision Layer Dashboard — Session Log

> Full development session from 2026-07-18.  
> Project: `decision-layer-dashboard` (Next.js 16 investment decision-support dashboard for CLIENT ECC).

---

## Table of Contents

1. [Technical Foundation](#1-technical-foundation)
2. [Phase 1 — Project Setup & Cleanup](#2-phase-1--project-setup--cleanup)
3. [Phase 2 — Live Feed Enhancements](#3-phase-2--live-feed-enhancements)
4. [Phase 3 — News Ingestion Pipeline](#4-phase-3--news-ingestion-pipeline)
5. [Phase 4 — Scenarios Module Overhaul](#5-phase-4--scenarios-module-overhaul)
6. [Phase 5 — Market Intelligence Page](#6-phase-5--market-intelligence-page)
7. [Phase 6 — FX Input Conversion](#7-phase-6--fx-input-conversion)
8. [Architecture & Conventions](#8-architecture--conventions)
9. [Key Files Reference](#9-key-files-reference)
10. [Verification Baseline](#10-verification-baseline)

---

## 1. Technical Foundation

| Layer | Detail |
|-------|--------|
| **Framework** | Next.js 16.2.4 (App Router, Turbopack) |
| **React** | 19, strict MVVM pattern |
| **State** | Zustand (`useGlobalStore`) — no persistence, hydrated by `bootstrapData()` |
| **DB** | Postgres + pgvector via Docker Compose (port 5433, DB `client_ecc`, user `decisionlayer`) |
| **ORM** | Prisma 5.22 (pinned). Connection string in `config/database.env` |
| **LLM** | Gemini (`gemini-2.5-flash` primary via `GEMINI_API_KEY`), Ollama (`llama3.2` fallback), heuristic fallback |
| **Realtime** | SSE via `/api/signals/stream` |
| **Dev commands** | `npm run dev` (Turbopack). Prisma: `env-cmd -f config/database.env npx prisma ...` |

---

## 2. Phase 1 — Project Setup & Cleanup

### 2.1 Running Locally
- Installed dependencies (`npm install`)
- Started Postgres via `docker-compose up -d`
- Ran Prisma migrations and seed
- Dev server on `http://localhost:3000`

### 2.2 Dead-Code Cleanup
- Removed unused/duplicate components, stale imports, and orphaned files
- Consolidated overlapping chart and card components
- Cleaned up barrel exports

---

## 3. Phase 2 — Live Feed Enhancements

Three tiers of work:

### 3.1 Shared Hook (#1)
- Extracted common signal-polling logic into a shared hook
- Used by both the Live Feed page and the notification bell

### 3.2 Resilience (#2)
- Added retry logic with exponential backoff for signal fetching
- Proper `AbortController` cleanup in effects (handles React strict-mode double-mount)

### 3.3 Server-Sent Events (#3)
- Implemented `/api/signals/stream` SSE endpoint
- `SignalStreamBoot` component in layout connects to SSE and pushes new signals into the Zustand store
- Signals arrive in real-time without polling

### 3.4 Live Feed Tier 1 UX
- Added `url`/`publisher` fields to signal display
- Severity pill badges (color-coded)
- Status line with timestamp and source

---

## 4. Phase 3 — News Ingestion Pipeline

### 4.1 Google News RSS → LLM Classification → DB
- Built ingestion pipeline: fetches Google News RSS feed, parses articles
- LLM (Gemini/Ollama) classifies each article by sector, severity, relevance
- Classified signals stored in Postgres via Prisma
- Deduplication by URL

### 4.2 Ingest Mode Controls
- Three modes: **auto** (periodic), **manual** (on-demand button), **off**
- Configurable via the Live Feed page UI
- Auto mode uses a configurable interval

---

## 5. Phase 4 — Scenarios Module Overhaul

### 5.1 Tier 1 — Domain Refactor
- Created `lib/scenarios/compute.ts` as the single source of truth for all scenario math
- **Key exports:** `DEFAULT_INPUTS`, `ScenarioBase`, `ScenarioBundle`, `baseFromPortfolio`, `baseFromRecommendation`, `computeScenarioCards`, `computeIrrProjection`, `expectedIrr`, `deltaFromOil`, `deltaFromFX`, `deltaFromIR`, `deltaFromInflation`
- Recommendation-seeded base scenarios (each recommendation provides its own base IRR/risk)
- Expected IRR (probability-weighted across scenario cards)
- Reset button to restore `DEFAULT_INPUTS`
- Fixed type issues throughout

### 5.2 Tier 2 — Advanced Analytics
- **Sensitivity / Tornado chart:** `computeSensitivity()` — varies each input ±delta while holding others constant, returns `SensitivityBar[]`
- **Monte Carlo simulation:** `computeMonteCarloBands()` — 2000 random draws with Gaussian perturbation, returns P10/P50/P90 bands as `McBandPoint[]`
- **Numeric slider entry:** `SliderControl` component (`components/ui/slider-control.tsx`) — combined slider + numeric input with min/max labels, reused across scenarios and market intelligence pages
- Sensitivity ranges and MC standard deviations defined in `SENSITIVITY_RANGES` and `MC_STD` constants

### 5.3 Tier 3 — AI Narrative & Saved Scenarios
- **AI scenario explanation:** "Explain" button calls `/api/scenarios/explain` (POST) → Gemini generates a narrative paragraph interpreting the current scenario inputs and results
- **Per-recommendation saved scenarios:** Users can name and save scenario snapshots scoped to a recommendation (or global). Saved to DB via Prisma. Saved scenarios can be loaded, compared (overlay on charts), and display their input summary
- Comparison chart shows multiple saved scenario IRR projections with an E[IRR] reference line

### 5.4 Mock Portfolio
- Created `mock-data/portfolio.ts` — 6 holdings across regions:
  - Sonelgaz Grid ($1.4B, North Africa)
  - Sahara Solar ($0.9B, North Africa)
  - Gulf Desalination ($0.8B, Middle East)
  - Maghreb Fintech ($0.6B, West Africa)
  - Offshore Gas ($1.6B, Sub-Saharan Africa)
  - Regional Logistics ($0.9B, Sub-Saharan Africa)
- Total AUM: ~$6.2B, weighted IRR: ~14.7%, weighted risk: ~57

### 5.5 Server-Side Compute Backend
- `POST /api/scenarios/compute` — accepts `{ inputs, recommendationId? }`, validates inputs, resolves base from portfolio + optional recommendation, runs `computeScenarioBundle()`, returns full bundle
- `parseInputs` validates all numeric fields as finite numbers
- Client VMs (scenarios + market intelligence) use server-as-source-of-truth with client fallback: debounced inputs → API call → use server result if compute key matches, else show client-computed result

---

## 6. Phase 5 — Market Intelligence Page

### 6.1 Page & Route
- New page at `/market-intelligence` with sidebar link
- `app/market-intelligence/page.tsx` (dynamic, `ssr: false`)
- `components/pages/market-intelligence/MarketIntelligencePage.tsx` (presentational)
- `components/pages/market-intelligence/useMarketIntelligenceViewModel.ts` (VM)

### 6.2 Portfolio Impact Simulator
- Displays mock portfolio summary (AUM, weighted IRR, weighted risk)
- 4 macro input sliders (oil price, USD/local FX rate, interest rate, inflation rate)
- Same compute backend as scenarios (`/api/scenarios/compute`)
- Shows scenario cards, IRR projection chart, sensitivity tornado, Monte Carlo bands
- Local inputs state (not store-backed, unlike the scenarios page)

---

## 7. Phase 6 — FX Input Conversion

Converted `fxDeltaPct` (percentage delta −20…+20%) to a proper **USD/local FX rate** (index 80–120, 100 = equilibrium).

| Aspect | Before | After |
|--------|--------|-------|
| **Field name** | `fxDeltaPct` | `usdLocalRate` |
| **Type comment** | `// -20..20` | `// FX index, 100 = equilibrium, >100 = USD stronger` |
| **Default** | `−5` | `95` |
| **Formula** | `−pct × 0.08` | `−(rate − 100) × 0.08` (identical math) |
| **Slider** | label "FX delta (%)", range −20…+20, unit "%" | label "USD/local FX rate", range 80…120, no unit |
| **Sensitivity** | "FX delta ±10pp" | "USD/local FX ±10" |
| **API compat** | — | `parseInputs` auto-converts legacy `fxDeltaPct` → `usdLocalRate` |

### Files changed:
- `types/scenario.ts` — `ScenarioInputs` interface
- `lib/scenarios/compute.ts` — `DEFAULT_INPUTS`, `deltaFromFX`, `SENSITIVITY_RANGES`, `MC_STD`, Monte Carlo sampler
- `lib/navigation/signalActionMapping.ts` — stress-test presets (82, 88, 92 instead of −18, −12, −8)
- `app/api/scenarios/compute/route.ts` — `parseInputs` with backward compat
- `app/api/scenarios/explain/route.ts` — prompt wording
- `components/pages/scenarios/ScenariosPage.tsx` — slider + saved scenario display
- `components/pages/market-intelligence/MarketIntelligencePage.tsx` — slider
- `docs/db-audit.md`, `docs/knowledge-base/api-reference.md`, `docs/knowledge-base/features-and-user-flows.md`

---

## 8. Architecture & Conventions

### MVVM Pattern (strict)
```
app/<route>/page.tsx          → dynamic import, ssr: false
components/pages/<route>/     → <Name>Page.tsx (presentational, receives VM props)
                              → use<Name>ViewModel.ts (hooks into store/API, returns view state)
```

### Store Pattern
- Single Zustand store: `lib/store/useGlobalStore.ts`
- Hydrated by `DataBootstrap` component in layout (calls `bootstrapData()`)
- No persistence — fresh state each page load
- Only VMs read/write the store; pages are pure presentational

### Scenario Compute Domain
- `lib/scenarios/compute.ts` is the **single source of truth** for all math
- Shared by: scenarios VM, market intelligence VM, compute API, seed script
- `mock-data/scenarios.v2.ts` re-exports from compute.ts for seed compatibility
- Delta functions: `deltaFromOil`, `deltaFromFX`, `deltaFromIR`, `deltaFromInflation`
- `computeScenarioBundle()` returns `{ cards, projection, expectedIrrPct, sensitivity, monteCarloBands }`

### API Conventions
- Route handlers in `app/api/<domain>/route.ts`
- POST for mutations/compute, GET for reads
- Return `NextResponse.json(...)` with appropriate status codes
- Input validation at the API boundary

### Process Rules
- Never commit/push without user approval
- After Prisma schema changes: kill dev server → `npx prisma generate` → restart (avoids EPERM lock on `query_engine-windows.dll.node`)
- Verification: `npx tsc --noEmit` (must be exit 0) + `npx eslint <files>` (0 new errors)
- Lint baseline: 16 pre-existing problems (7 errors, 9 warnings) — do not increase

---

## 9. Key Files Reference

### Core Domain
| File | Purpose |
|------|---------|
| `lib/scenarios/compute.ts` | All scenario math (delta fns, cards, IRR, sensitivity, Monte Carlo) |
| `types/scenario.ts` | `ScenarioInputs`, `ScenarioCard`, `ScenarioBundle`, `PortfolioHolding`, etc. |
| `mock-data/portfolio.ts` | 6-holding mock portfolio ($6.2B AUM) |
| `lib/store/useGlobalStore.ts` | Zustand store (scenarios, signals, recommendations, risk, ESG, workflow) |

### Scenario Pages
| File | Purpose |
|------|---------|
| `components/pages/scenarios/ScenariosPage.tsx` | Scenarios page UI |
| `components/pages/scenarios/useScenariosViewModel.ts` | VM — store-backed inputs, server compute, saved scenarios |
| `components/pages/market-intelligence/MarketIntelligencePage.tsx` | Market Intelligence UI |
| `components/pages/market-intelligence/useMarketIntelligenceViewModel.ts` | VM — local inputs, server compute |

### API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/scenarios/compute` | POST | Server-side scenario computation |
| `/api/scenarios/explain` | POST | AI narrative generation (Gemini) |
| `/api/signals/stream` | GET | SSE signal stream |

### Shared UI
| File | Purpose |
|------|---------|
| `components/ui/slider-control.tsx` | Reusable slider + numeric input with min/max labels |
| `components/layout/DataBootstrap.tsx` | Store hydration on mount |
| `components/layout/SignalStreamBoot.tsx` | SSE connection for realtime signals |

---

## 10. Verification Baseline

```
npx tsc --noEmit          → exit 0 (zero type errors)
npx eslint .              → 16 pre-existing problems (7 errors, 9 warnings)
                             All from files NOT modified in this session
Dev server                → http://localhost:3000 (Turbopack)
Database                  → Postgres on localhost:5433 (Docker)
```

### Known Pre-existing Lint Issues
These 16 problems existed before the session and are NOT regressions. Do not try to fix them as part of new work — they are tracked separately.
