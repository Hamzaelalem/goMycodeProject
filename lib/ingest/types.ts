/** Shared, dependency-free types for the news-ingestion pipeline. */

import type { SignalSeverity, SignalType } from "@/types";

/**
 * Runtime fetch mode for news ingestion:
 * - `auto`      scheduled fetches run (every 30 min) + on-demand allowed
 * - `manual`    scheduler paused; on-demand fetches only
 * - `off`       no fetching at all (scheduled and on-demand both blocked)
 */
export type IngestMode = "auto" | "manual" | "off";

/** A Google News search tagged with the domain metadata to attach to results. */
export interface WatchItem {
  /** Google News search query. */
  query: string;
  sector: string;
  region: string;
  /** ISO 3166 alpha-2 country hint for the resulting signals. */
  country: string;
}

/** A raw article parsed from a Google News RSS feed. */
export interface RawArticle {  title: string;
  link: string;
  guid: string;
  /** ISO timestamp of publication. */
  publishedAt: string;
  publisher: string;
  summary: string;
}

/** LLM/heuristic classification for a single article. */
export interface ArticleClassification {
  type: SignalType;
  severity: SignalSeverity;
  /** -1 (very negative) .. 1 (very positive). */
  sentiment: number;
}

/** Result summary of one ingestion run. */
export interface IngestSummary {
  ok: boolean;
  fetched: number;
  inserted: number;
  duplicates: number;
  queries: number;
  classifier: "llm" | "heuristic" | "mixed" | "none";
  startedAt: string;
  finishedAt: string;
  error?: string;
}
