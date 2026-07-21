import { prisma } from "@/lib/db/prisma";
import type { Signal } from "@/types";
import { classifyArticles, type ClassifierMethod } from "./classify";
import { fetchGoogleNews } from "./googleNews";
import type { IngestSummary, RawArticle, WatchItem } from "./types";
import { getWatchlist } from "./watchlist";

/** Stable, collision-resistant id for an article link (djb2 → base36). */
function stableId(link: string): string {
  let hash = 5381;
  for (let i = 0; i < link.length; i++) {
    hash = (hash * 33) ^ link.charCodeAt(i);
  }
  return `news-${(hash >>> 0).toString(36)}`;
}

function formatBody(article: RawArticle): string {
  return article.summary && article.summary !== article.title ? article.summary : article.title;
}

interface Tagged {
  article: RawArticle;
  watch: WatchItem;
}

// Module-level run state (single Node server process).
let running = false;
let lastRun: IngestSummary | null = null;

export function getLastIngestRun(): IngestSummary | null {
  return lastRun;
}

export function isIngestRunning(): boolean {
  return running;
}

/**
 * Fetches Google News for every watchlist query, classifies the articles
 * (LLM or heuristics), and inserts them as new `Signal` rows. Ingested signals
 * are stamped with `timestamp = now` so the SSE stream broadcasts them to
 * connected clients immediately. Idempotent via a stable id derived from the
 * article link (`skipDuplicates`).
 */
export async function runNewsIngest(opts?: { limitPerQuery?: number }): Promise<IngestSummary> {
  const startedAt = new Date().toISOString();

  if (running) {
    return {
      ok: false,
      fetched: 0,
      inserted: 0,
      duplicates: 0,
      queries: 0,
      classifier: "none",
      startedAt,
      finishedAt: new Date().toISOString(),
      error: "Ingestion already running",
    };
  }

  running = true;
  const envLimit = Number(process.env.INGEST_LIMIT_PER_QUERY);
  const limitPerQuery =
    opts?.limitPerQuery ?? (Number.isFinite(envLimit) && envLimit > 0 ? envLimit : 6);
  const watchlist = getWatchlist();

  try {
    // 1) Fetch every query (independent; failures per-query are non-fatal).
    const tagged: Tagged[] = [];
    const settled = await Promise.allSettled(
      watchlist.map((watch) => fetchGoogleNews(watch.query, limitPerQuery)),
    );
    settled.forEach((result, i) => {
      if (result.status === "fulfilled") {
        for (const article of result.value) tagged.push({ article, watch: watchlist[i]! });
      } else {
        console.warn(`[ingest] fetch failed for "${watchlist[i]!.query}":`, result.reason);
      }
    });

    // De-duplicate within this run by link.
    const seenLinks = new Set<string>();
    const unique = tagged.filter(({ article }) => {
      if (seenLinks.has(article.link)) return false;
      seenLinks.add(article.link);
      return true;
    });

    const fetched = unique.length;
    if (fetched === 0) {
      lastRun = {
        ok: true,
        fetched: 0,
        inserted: 0,
        duplicates: 0,
        queries: watchlist.length,
        classifier: "none",
        startedAt,
        finishedAt: new Date().toISOString(),
      };
      return lastRun;
    }

    // 2) Classify (batched).
    const { method, classifications } = await classifyArticles(unique.map((t) => t.article));
    const classifier: IngestSummary["classifier"] = method as ClassifierMethod;

    // 3) Build signal rows (timestamp = now so SSE pushes them live).
    const now = Date.now();
    const rows: Signal[] = unique.map(({ article, watch }, i) => {
      const c = classifications[i]!;
      return {
        id: stableId(article.link),
        title: article.title.slice(0, 300),
        body: formatBody(article),
        type: c.type,
        severity: c.severity,
        sentiment: c.sentiment,
        reach: 0,
        // Stagger by 1ms so ordering is stable and all are strictly after the SSE cursor.
        timestamp: new Date(now + i).toISOString(),
        source: "internal",
        country: watch.country,
        region: watch.region,
        sector: watch.sector,
        url: article.link,
        publisher: article.publisher,
      };
    });

    // 4) Insert, skipping any ids already present (idempotent re-runs).
    const result = await prisma.signal.createMany({
      data: rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        type: r.type,
        severity: r.severity,
        sentiment: r.sentiment,
        reach: r.reach,
        timestamp: new Date(r.timestamp),
        source: r.source,
        country: r.country,
        region: r.region,
        sector: r.sector,
        url: r.url,
        publisher: r.publisher,
        dataSource: "live", // real news articles, not seeded fixtures
      })),
      skipDuplicates: true,
    });

    lastRun = {
      ok: true,
      fetched,
      inserted: result.count,
      duplicates: fetched - result.count,
      queries: watchlist.length,
      classifier,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
    return lastRun;
  } catch (error) {
    lastRun = {
      ok: false,
      fetched: 0,
      inserted: 0,
      duplicates: 0,
      queries: watchlist.length,
      classifier: "none",
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown ingestion error",
    };
    return lastRun;
  } finally {
    running = false;
  }
}
