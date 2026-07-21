import type { WatchItem } from "./types";

/**
 * Default set of Google News searches, each tagged with the sector/region/country
 * to stamp on the resulting signals. Override at runtime with the `INGEST_WATCHLIST`
 * env var (a JSON array of `WatchItem`).
 */
export const DEFAULT_WATCHLIST: WatchItem[] = [
  { query: "solar OR renewable energy investment", sector: "Solar & Energy", region: "Europe", country: "ES" },
  { query: "oil and gas prices market outlook", sector: "Oil & Gas", region: "MENA", country: "AE" },
  { query: "banking sector earnings credit", sector: "Banking", region: "Europe", country: "DE" },
  { query: "infrastructure investment Africa", sector: "Logistics", region: "Africa", country: "KE" },
  { query: "central bank interest rate inflation", sector: "Macro", region: "Global", country: "US" },
  { query: "ESG sustainability regulation policy", sector: "ESG", region: "Europe", country: "FR" },
];

export function getWatchlist(): WatchItem[] {
  const raw = process.env.INGEST_WATCHLIST;
  if (!raw) return DEFAULT_WATCHLIST;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (w) =>
          w &&
          typeof w === "object" &&
          typeof (w as WatchItem).query === "string" &&
          typeof (w as WatchItem).sector === "string" &&
          typeof (w as WatchItem).region === "string" &&
          typeof (w as WatchItem).country === "string",
      )
    ) {
      return parsed as WatchItem[];
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_WATCHLIST;
}
