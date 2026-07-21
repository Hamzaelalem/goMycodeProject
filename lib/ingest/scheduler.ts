import { runNewsIngest } from "./newsIngest";
import type { IngestMode } from "./types";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
// Delay the boot ingest a few seconds so the server finishes starting first.
const BOOT_RUN_DELAY_MS = 8_000;

// Persist the timer across HMR reloads / duplicate module evaluations.
const globalForScheduler = globalThis as unknown as {
  __ingestScheduler?: ReturnType<typeof setInterval>;
  __ingestMode?: IngestMode;
};

function defaultMode(): IngestMode {
  return process.env.INGEST_ENABLED === "false" ? "manual" : "auto";
}

/** Current runtime fetch mode (settable from the UI via the API). */
export function getIngestMode(): IngestMode {
  return (globalForScheduler.__ingestMode ??= defaultMode());
}

export function setIngestMode(mode: IngestMode): void {
  globalForScheduler.__ingestMode = mode;
}

/**
 * Starts the periodic news-ingestion timer (default every 6 hours). Called once
 * from `instrumentation.ts` on server boot. The interval always runs, but a tick
 * only ingests when the runtime mode is `auto` — so the mode can be toggled live
 * from the UI without a restart. In `auto` mode it also runs once shortly after
 * boot so the live feed isn't empty until the first 6h tick.
 *
 * Controlled by env:
 * - `INGEST_ENABLED=false`    starts in `manual` mode (scheduler paused).
 * - `INGEST_INTERVAL_MS=...`  overrides the interval (default 6h).
 * - `INGEST_RUN_ON_BOOT=false` disables the one-time boot ingest.
 */
export function startIngestScheduler(): void {
  getIngestMode(); // ensure initialized
  if (globalForScheduler.__ingestScheduler) return;

  const parsed = Number(process.env.INGEST_INTERVAL_MS);
  const interval = Number.isFinite(parsed) && parsed >= 60_000 ? parsed : SIX_HOURS_MS;

  globalForScheduler.__ingestScheduler = setInterval(() => {
    if (getIngestMode() !== "auto") return;
    void runNewsIngest().catch((error) => {
      console.warn("[ingest] scheduled run failed:", error);
    });
  }, interval);

  // One-time ingest shortly after boot so the feed populates without waiting a
  // full interval (or a manual "Fetch latest news" click).
  if (process.env.INGEST_RUN_ON_BOOT !== "false") {
    setTimeout(() => {
      if (getIngestMode() !== "auto") return;
      void runNewsIngest().catch((error) => {
        console.warn("[ingest] boot run failed:", error);
      });
    }, BOOT_RUN_DELAY_MS);
  }

  console.log(
    `[ingest] scheduler started (every ${Math.round(interval / 60_000)} min), mode=${getIngestMode()}`,
  );
}
