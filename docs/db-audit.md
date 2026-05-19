# Database integration audit (Step 1)

Generated from repository scan. Shapes are taken from `/types/*.ts` and mock payloads.

## 1A — Mock data files

| File | Notes |
|------|--------|
| `mock-data/recommendations.ts` | Re-exports `recommendations` from `recommendations.v2.ts` |
| `mock-data/recommendations.v2.ts` | 12 `Recommendation` records |
| `mock-data/signals.ts` | Re-exports `seededSignals` from `signals.v2.ts` |
| `mock-data/signals.v2.ts` | 27 `Signal` records |
| `mock-data/riskScores.ts` | `RiskFactorScore[]` |
| `mock-data/esgInputs.ts` | `EsgSectorInputs[]` (per-sector KPIs + scores) |
| `mock-data/scenarios.v2.ts` | `DEFAULT_INPUTS`, `computeScenarioCards`, `computeIrrProjection` (no static array export) |
| `mock-data/workflowLog.ts` | `WorkflowLogEntry[]` |

No `lib/mock-data/` directory.

## 1B — Consumers (import dependency map)

```
mock-data/recommendations.ts
  → lib/store/useGlobalStore.ts

mock-data/signals.ts (seededSignals)
  → lib/store/useGlobalStore.ts

mock-data/riskScores.ts
  → components/pages/dashboard/DashboardPage.tsx
  → components/pages/risk/RiskPage.tsx

mock-data/esgInputs.ts
  → components/pages/dashboard/DashboardPage.tsx
  → components/pages/esg/EsgPage.tsx (as `seed`)

mock-data/scenarios.v2.ts
  → components/pages/scenarios/ScenariosPage.tsx

mock-data/workflowLog.ts
  → components/drawers/RecommendationDrawer.tsx
  → components/pages/workflow/WorkflowPage.tsx
```

`lib/hooks/useSignalStream.ts` does **not** import mock signals; it synthesizes stream events client-side.

## 1C — TypeScript shapes (authoritative: `/types`)

### Recommendation (`types/recommendation.ts`)

- `id: string`
- `rank: number`
- `title: string`
- `region: string`
- `sector: string`
- `country: string`
- `capitalUsd: number`
- `irrPct: number`
- `horizonYears: number`
- `riskLevel: RiskLevel` — `"low" \| "medium" \| "high"`
- `confidence: number` (0–100)
- `status: RecommendationStatus` — `"approved" \| "under_review" \| "pending_review" \| "rejected"`
- `tags: string[]`
- `rationale: string`
- `scoreBreakdown: RecommendationScoreBreakdown[]` — `{ dimension: ScoreDimension; score: number }`
- `modelVersion: string`
- `generatedAt: string` (ISO)
- `riskFactors: string[]`

### Signal (`types/signal.ts`)

- `id: string`
- `title: string`
- `body: string`
- `type: SignalType` — `"risk" \| "opportunity" \| "policy" \| "deal" \| "market"`
- `severity: SignalSeverity` — `"critical" \| "high" \| "medium" \| "low"`
- `sentiment: number` (-1..1)
- `reach: number`
- `timestamp: string` (ISO)
- `source: SignalSource` — `"bloomberg" \| "talkwalker" \| "internal"`
- `country: string`
- `region: string`
- `sector: string`
- `riskFactor?: string`
- `workflowItemId?: string`

### RiskFactorScore (`types/risk.ts`)

- `id: string`
- `name: string`
- `score: number` (0–100)
- `previousScore: number`
- `sparklineData: number[]`
- `source: RiskFactorSource` — `"bloomberg" \| "talkwalker" \| "manual"`
- `region: string`

(UI derives trend from `score` vs `previousScore`; no `trend` field on type.)

### EsgSectorInputs (`types/esg.ts`)

- `sector: string`
- `kpis: EsgSectorKpi[]` — `{ id, label, value, unit, pillar }`
- `scores: { E, S, G, overall, grade }`

### Scenario types (`types/scenario.ts`)

- `ScenarioInputs`: `oilPrice`, `fxDeltaPct`, `interestRate`, `inflationRate`
- `ScenarioCard`: `id`, `label`, `probabilityPct`, `portfolioIrrPct`, `projectedAumB`, `riskScore`
- `IrrProjectionPoint`: `year`, `base`, `bull`, `bear`, `stress`

Scenarios module computes cards/projection from inputs in the client today (`scenarios.v2.ts`).

### WorkflowLogEntry (`types/workflow.ts`)

- `id: string`
- `recommendationId: string`
- `status: WorkflowStatus` — uppercase enum in type file
- `actor: string`
- `role: string`
- `timestamp: string` (ISO)
- `comment: string`

### Zustand `decisionLog` (not a standalone `/types` export)

In `useGlobalStore.ts`:

- `{ recommendationId: string; action: string; comment?: string; at: string }`

Used for lightweight audit trail on approve/reject in the client.

## 1D — Mismatches vs prompt’s example Prisma schema

The prompt’s example used snake_case DB fields, different recommendation field names (`amount_usd`, `expected_irr`, `time_horizon`, uppercase statuses, etc.) and types that do not exist in this repo (e.g. flat `ESGInput` with `company_id`).

**Actual integration** uses:

- Prisma field names aligned with the existing **camelCase** UI models (with JSON where the UI already uses nested structures).
- Recommendation **status** stored as the app’s lowercase literals (`pending_review`, …), not `PENDING_REVIEW`.
- Separate tables for **risk factor rows**, **ESG sector JSON blobs**, **scenario snapshot JSON**, and **workflow log entries**, matching the shapes above.

---

End of Step 1 audit.

---

## Addendum (implementation)

- **Prisma version:** The repo pins **Prisma 5.22.0** (`prisma` + `@prisma/client`). Prisma 7+ removed `url` from `schema.prisma` in favor of a separate config file; v5 keeps the standard `DATABASE_URL` datasource block used here.
- **Migrations:** Initial SQL is checked in under `prisma/migrations/20250504120000_init/`. Apply with `npx prisma migrate deploy` (or `migrate dev`) once PostgreSQL is available.
- **Tooling:** `npm run postinstall` runs `prisma generate`. `prisma db seed` uses `env-cmd -f config/database.env` so the seed script picks up the same `DATABASE_URL` as CLI migrations.
