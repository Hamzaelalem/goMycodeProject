# Decision Layer Dashboard

An investment decision-support prototype that brings portfolio holdings, news signals, recommendations, risk, ESG, scenario analysis, and human review into one interface.

**Submission target:** a reproducible demonstration using synthetic data, with no real API credentials, published passwords, or private client data. Rebalancing is a simulation; the application does not execute trades.

**Status — 27 September 2026:** the main prototype features are implemented. Submission preparation is in progress. The current code is not yet a fully offline, password-free demo; the remaining changes are listed below. This README reflects the working tree, including uncommitted work.

## Submission requirements and links

Based on the organizer instructions supplied to the team, submit **once through the official Google Form by 17:30 Tunis time on 27 September 2026**. The form requires URLs, not file uploads. A GitHub push, Docker image, or deployed website does not submit the project.

| Required form field | Final URL | Status |
| --- | --- | --- |
| Source code URL | TODO: repository containing actual source code | Not provided |
| Presentation URL | TODO: viewable Google Slides or hosted PDF link | Not provided |
| 90-second demo video URL | TODO: viewable Loom, unlisted YouTube, or shared Drive video | Not provided |

**Official submission form:** use the organizer-provided link; its URL has not been supplied here. Do not replace these entries with localhost addresses or invented links.

A public deployment and Docker image are **optional**. If an app is deployed, add its live URL here and in the presentation; it does not replace any of the three required links. The included Compose file currently runs PostgreSQL only, not the entire application.

## Problem, solution, and value

Investment reviewers need to connect scattered portfolio information, risk factors, ESG indicators, and changing market conditions before making a decision. This prototype organizes those inputs into a reviewable workflow: inspect a portfolio, explore scenarios, review recommendations, and compare simulated allocation changes.

The submission should demonstrate explainable decision support and human oversight with clearly labeled synthetic inputs. It should not claim verified market predictions, real investment performance, or live execution.

## What is implemented

| Module | Current capability | Limitation to disclose |
| --- | --- | --- |
| Dashboard | Filtered KPIs, recommendation pipeline, risk/ESG charts, signal preview | Values depend on demo/seeded inputs |
| My Portfolio | Add/edit/delete holdings, CSV validation and preview, import/export, weighted summaries, audit trail | One shared portfolio; 25 holdings maximum; initial demo holdings |
| Recommendations | Review drawer, filtering, generation integrations, validation, confidence checks, approve/reject and audit records | Existing generation needs an inference provider; synthetic examples can be reviewed without generation |
| Portfolio Sentinel | Per-holding BUY/SELL/HOLD proposals, rationale, confidence, guardrails, human sign-off and allocation simulation | Current scan fetches external news; results/sign-off/simulation are not persisted |
| Live Feed | News ingestion, classification, deduplication, filtering, publisher links and SSE updates | Current ingestion uses external RSS; seeded signals are available for demonstration |
| Risk and ESG | Risk factor scores feed the dashboard charts, recommendation confidence checks and the assistant (the standalone Risk page was removed); ESG sector scores and filters | Seeded data, not a validated live scoring service |
| Scenarios | Macro controls, expected IRR, projections, sensitivity, Monte Carlo bands, saved comparisons | Assumed sensitivities; narrative generation can use external providers |
| Market Intelligence | Portfolio impact simulation using saved holdings and the scenario engine | Simulation, not a live pricing terminal |
| Workflow | Review actions and history | Shared reviewer identity; approval-time metric remains a placeholder |
| Assistant and document retrieval | Streaming assistant, chunking, embeddings and pgvector retrieval | Optional model setup and separate document indexing required |

Portfolio inputs use AUM in **USD millions**; storage uses **USD billions**. Sentinel guardrails cap each proposed adjustment at 5 percentage points, downgrade low-confidence/no-news actions to HOLD, and prevent selling more than the current weight. Simulated weights are subsequently normalized to 100%.

## Finalization plan: submission first

These items separate the required submission package from future production features. Unchecked items are still outstanding, not completed claims.

### 1. Finish a safe, reproducible demo

- [ ] Add an explicit synthetic demo mode that needs no API keys or login password and makes no external news or inference requests. Keep any authentication bypass restricted to that demo mode.
- [ ] Supply deterministic demo results for Sentinel, recommendations, assistant/explanations, and signals; label simulated output visibly. Missing credentials alone do not disable every external request today.
- [ ] Remove usable passwords from tracked configuration. `docker-compose.yml` and `config/database.env` currently contain a development database credential; replace it with local configuration and a placeholder-only example before publishing.
- [ ] Verify the portfolio → scenarios → recommendation review → Sentinel simulation flow with synthetic data. Remove or label placeholder metrics.
- [ ] Run a clean installation, database migration/seed, production build, and a browser walkthrough using the final submission configuration.
- [ ] Update the run instructions below after demo mode is implemented, so a reviewer can reproduce the exact recorded experience.

### 2. Prepare the three deliverables

- [ ] Publish the actual source repository with this README, dependency lockfile, migrations, synthetic fixtures, and placeholder-only configuration examples.
- [ ] Prepare and share the presentation: problem, intended users, solution, architecture, working features, value, limitations, and next steps.
- [ ] Record a 90-second narrated screen demonstration. Camera is optional. Loom is recommended by the supplied instructions; an accessible YouTube or Drive video is also accepted.
- [ ] Replace the three TODO entries above with final URLs.
- [ ] Test every link while signed out or in a private browser window. The jury must be able to view the slides and video without requesting access. For a private repository, ask organizers which reviewer account to invite.

### 3. Check privacy and submit once

- [ ] Review tracked files and Git history for credentials, tokens, private URLs and personal/client data. Do not publish `.env.local`, database exports, session cookies, or provider logs. Remove exposed secrets from publishable history and revoke/rotate any that were genuinely used.
- [ ] Record only synthetic data. Hide terminals containing environment values, browser password prompts, account pages, notifications, and private tabs. Review the finished video and slides for accidental disclosure.
- [ ] Confirm recording length and sharing permissions within the recording account's limits.
- [ ] One team lead or solo entrant opens the official Google Form, uses the final team name and lead email, pastes all three links, and completes every required project field and prize selection.
- [ ] Press **Submit** once before the deadline and save the confirmation.

**Current status:** no final links or submission confirmation have been supplied. Documentation changes do not mean the project has been published or submitted.

## Suggested 90-second demo

| Time | Show and narrate |
| --- | --- |
| 0–15 seconds | The decision-making problem and who the dashboard helps |
| 15–35 seconds | Synthetic portfolio holdings, a holding edit, and the updated summary |
| 35–55 seconds | Change a macro scenario input and explain the resulting comparison |
| 55–75 seconds | Review a recommendation and show Sentinel guardrails and human sign-off using the finalized synthetic demo |
| 75–90 seconds | Simulated allocation comparison, the value of the workflow, and a clear statement that data/results are illustrative |

Rehearse against the final build. If a step is not working, simplify the recorded flow and disclose the limitation; do not present static or simulated output as a live service.

## Installation and current local run instructions

These instructions describe the **current implementation**. It still requires locally configured authentication and PostgreSQL credentials. They are not instructions for a completed password-free demo. Never publish actual values or reuse personal/production passwords for local setup.

### Dependencies

- Node.js 20.10+ and npm.
- PostgreSQL 16 with pgvector; the included Docker Compose service is a local convenience.
- Next.js 16.2.4, React 19.2.4, TypeScript, Tailwind CSS 4, Radix/shadcn, Recharts, Zustand 5, Prisma 5.22 and Vitest are installed from the dependency lockfile.
- No cloud API account is needed to inspect seeded records, edit portfolio holdings, or use numeric scenario calculations. AI generation and document retrieval are optional and are outside the intended submission demo setup.

### Local setup

1. Run `npm ci` to install dependencies and generate Prisma Client.
2. Create a private `.env.local` using [`.env.example`](.env.example) as a reference. Preserve existing private configuration. The current login gate requires `AUTH_PASSWORD` and `AUTH_SECRET`; choose local values privately. Do not put actual values in the README or repository.
3. For a demo using seeded data, leave cloud API keys unset in both the process environment and local environment files, and set:

   ```dotenv
   INGEST_ENABLED=false
   INGEST_RUN_ON_BOOT=false
   INGEST_DISABLE_OLLAMA=true
   ```

   These settings pause automatic news ingestion and selected local-model calls. They **do not** make the current app fully offline: avoid Fetch News, Sentinel Scan, AI Generate, Assistant, Explain, and RAG ingestion until synthetic demo mode is implemented. Existing configured cloud keys must not be used for the submission walkthrough.

4. Configure a private local database connection, start PostgreSQL, then initialize a fresh demo database:

   ```bash
   npm run db:up
   npm run db:setup
   npm run dev
   ```

5. Open `http://localhost:3000` locally and sign in. A localhost address cannot be used by remote jury members; demonstrate local operation in the video.

**Seed behavior:** `db:setup` applies migrations and reseeds recommendations, recommendation audit logs, workflow entries, signals, risk scores, ESG inputs, and scenario snapshots. It deletes existing data in those datasets. Use a dedicated demo database. For an existing database whose data must be preserved, use `npm run db:migrate` without seeding. Portfolio holdings are initialized separately on first read; RAG documents are not seeded.

**Configuration caveat:** the Next.js server reads `DATABASE_URL` from its environment/`.env.local`, then falls back to `config/database.env`. Database CLI scripts explicitly load `config/database.env`; changing only `.env.local` does not retarget those scripts. The tracked development credential must be removed and these paths updated together before sharing a credential-free source package.

### Model and data setup

Use the synthetic fixtures in `mock-data/` for the submission. No client documents, real portfolio data, API keys, or cloud model setup should be required for the finalized demo.

The current optional local inference implementation supports Ollama with `llama3.2` and `nomic-embed-text`; these models must be installed separately if developing those features. Document retrieval requires an explicit authenticated ingestion step and consistent embedding models. Bundled Markdown documents are examples. This optional path is not a substitute for implementing the deterministic demo mode above.

## Architecture

```text
app/                         Route pages and API handlers
components/pages/            Presentational pages and view-model hooks
components/pages/sentinel/   Sentinel panel inside Recommendations
components/layout/           Shell, bootstrap, notifications and signal stream
lib/store/                   Shared Zustand state and API hydration
lib/portfolio/               Holding validation, CSV, summaries and persistence
lib/sentinel/                Directive guardrails and allocation simulation
lib/scenarios/               Shared scenario calculations
lib/ingest/                  News fetching, classification and scheduler
lib/recommendations/         Generation, validation and confidence checks
lib/llm/ and lib/rag/        Optional inference and document retrieval
prisma/                      Schema, migrations and demo seed
mock-data/                   Synthetic fixtures and example documents
proxy.ts                     Current shared-password access gate
instrumentation.ts           Starts the in-process news scheduler
```

The client store starts with fixtures and loads seven domains through API handlers. Failed reads may leave fixtures in place. Durable records live in PostgreSQL; filters and Sentinel simulation state remain in memory. Successful database access does not imply that the stored data is real market data.

Before changing Next.js code, follow [`AGENTS.md`](AGENTS.md) and the relevant bundled documentation in `node_modules/next/dist/docs/`.

## Commands and verification

| Command | Purpose |
| --- | --- |
| `npm ci` | Install locked dependencies and generate Prisma Client |
| `npm run dev` | Start development server |
| `npm run build` / `npm start` | Build / serve production application |
| `npm test` | Run unit tests |
| `npx tsc --noEmit` | Type-check |
| `npm run lint` | Run ESLint |
| `npm run db:up` / `npm run db:down` | Start / stop local PostgreSQL |
| `npm run db:migrate` | Apply migrations without seeding |
| `npm run db:generate` | Regenerate Prisma Client after schema changes |
| `npm run db:setup` | Migrate and reset the seeded demo datasets |

Verification from the earlier **27 September 2026 source review**:

- 49 unit tests passed across 7 files.
- TypeScript passed.
- ESLint: 0 errors, 1 TanStack Virtual/React Compiler compatibility warning.
- Production build, clean database setup, browser walkthrough, and a fully offline demo remain unverified. These results do not certify submission readiness.

A limited pattern scan of tracked working-tree files during submission documentation preparation found no matches for common API-key/private-key formats. `.env.local` is ignored. The known tracked development database credential remains a blocker. Git history and media have not been audited; this is not a guarantee that the repository is free of secrets.

## After submission

Future work may include persistent Sentinel scan/review history, individual reviewer roles, stronger integration tests, calibrated scenario models, multi-portfolio support, and deployment monitoring. Real data integrations are outside the current submission scope. They are not needed to demonstrate the synthetic prototype.

## Further documentation

- [Knowledge-base index](docs/knowledge-base/README.md)
- [Architecture](docs/knowledge-base/architecture.md)
- [API reference](docs/knowledge-base/api-reference.md)
- [Database reference](docs/knowledge-base/database-reference.md)
- [AI subsystem](docs/knowledge-base/ai-subsystem.md)
- [Historical backlog](docs/knowledge-base/risks-and-backlog.md)
- [Development session log](docs/session-log.md)

Older documents predate the portfolio/Sentinel additions and may contain outdated setup or backlog assumptions. Use this submission checklist and the current source when preparing the final package.
