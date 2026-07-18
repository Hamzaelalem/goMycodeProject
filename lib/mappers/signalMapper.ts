import type { Signal } from "@/types";
import type { Signal as SignalRow } from "@prisma/client";

export function mapSignalFromDb(row: SignalRow): Signal {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type as Signal["type"],
    severity: row.severity as Signal["severity"],
    sentiment: row.sentiment,
    reach: row.reach,
    timestamp: row.timestamp.toISOString(),
    source: row.source as Signal["source"],
    country: row.country,
    region: row.region,
    sector: row.sector,
    riskFactor: row.riskFactor ?? undefined,
    workflowItemId: row.workflowItemId ?? undefined,
    url: row.url ?? undefined,
    publisher: row.publisher ?? undefined,
  };
}
