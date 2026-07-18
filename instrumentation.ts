/**
 * Runs once when a Next.js server instance boots. We use it to start the
 * periodic news-ingestion scheduler in the Node.js runtime only.
 * See: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startIngestScheduler } = await import("@/lib/ingest/scheduler");
  startIngestScheduler();
}
