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

/** Country code stamped on signals from portfolio-derived searches, by region. */
const REGION_COUNTRY: Record<string, string> = {
  "North Africa": "MA",
  "West Africa": "NG",
  "East Africa": "KE",
  "Central Africa": "CM",
  "Southern Africa": "ZA",
  "Sub-Saharan Africa": "ZA",
  "Middle East": "AE",
  Europe: "DE",
  Asia: "SG",
  Americas: "US",
};

/**
 * The configured watchlist plus one search per distinct sector + region in the
 * client's saved portfolio, so the live feed follows what the client holds.
 * Portfolio lookup failures fall back to the configured watchlist alone.
 */
export async function getIngestWatchlist(): Promise<WatchItem[]> {
  const base = getWatchlist();
  let holdings: Array<{ sector: string; region: string }> = [];
  try {
    const { listHoldings } = await import("@/lib/portfolio/repository");
    holdings = await listHoldings();
  } catch (error) {
    console.warn("[ingest] portfolio unavailable for watchlist:", error instanceof Error ? error.message : error);
  }

  const seen = new Set(base.map((w) => w.query.toLowerCase()));
  const fromPortfolio: WatchItem[] = [];
  for (const { sector, region } of holdings) {
    const query = `${sector} ${region} market news`;
    if (seen.has(query.toLowerCase())) continue;
    seen.add(query.toLowerCase());
    fromPortfolio.push({ query, sector, region, country: REGION_COUNTRY[region] ?? "—" });
  }
  return [...base, ...fromPortfolio];
}

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
